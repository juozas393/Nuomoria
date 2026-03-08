/**
 * Deposit Calculator — Centralized deposit return logic
 * 
 * 🧾 DEPOZITO GRĄŽINIMO LOGIKA
 * 
 * 🔹 1. Sutartis dar galioja (iki pabaigos datos):
 *   ✅ Išsikrausto sutarties pabaigoje:
 *     - Pranešė ≥30d prieš → Grąžinamas visas depozitas
 *     - Pranešė <30d prieš → Išskaičiuojama 1 mėn. nuoma
 *     - Nepranešė → Išskaičiuojama 1 mėn. nuoma
 * 
 *   ✅ Išsikrausto anksčiau nei sutarties pabaiga:
 *     - Pranešė ≥30d prieš → Išskaičiuojama 1 mėn. nuoma
 *     - Pranešė <30d prieš → Visas depozitas prarandamas
 *     - Nepranešė → Visas depozitas prarandamas
 * 
 * 🔹 2. Sutartis pasibaigusi (neterminuota fazė):
 *     - Pranešė ≥30d prieš → Grąžinamas visas depozitas
 *     - Pranešė <30d prieš → Išskaičiuojama 1 mėn. nuoma
 *     - Nepranešė → Išskaičiuojama 1 mėn. nuoma
 * 
 * 🛑 Depozitas negali būti naudojamas sąskaitoms, remontui ar skoloms padengti.
 *    Nuomininkas turi pats padengti visus įsipareigojimus.
 * 
 * ⏱️ Depozitas grąžinamas per 14 kalendorinių dienų nuo patikros.
 */

export type DepositScenario =
    | 'active_at_end_notice_ok'       // Leaving at contract end, ≥30d notice
    | 'active_at_end_notice_late'     // Leaving at contract end, <30d notice
    | 'active_at_end_no_notice'       // Leaving at contract end, no notice
    | 'active_early_notice_ok'        // Leaving early, ≥30d notice
    | 'active_early_notice_late'      // Leaving early, <30d notice
    | 'active_early_no_notice'        // Leaving early, no notice
    | 'indefinite_notice_ok'          // Indefinite, ≥30d notice
    | 'indefinite_notice_late'        // Indefinite, <30d notice
    | 'indefinite_no_notice';         // Indefinite, no notice

export interface DepositCalculation {
    returnAmount: number;
    deductionAmount: number;
    deductionReason: string;
    scenario: DepositScenario;
    scenarioLabel: string;
    noticeDays: number;
    isFullReturn: boolean;
    isFullForfeit: boolean;
}

export interface DepositCalcParams {
    contractEnd: string | null;   // ISO date string
    terminationDate: string;      // ISO date string — when tenant wants to leave
    requestDate?: string;         // ISO date string — when request was made (defaults to today)
    monthlyRent: number;          // Monthly rent for 1-month deduction
    depositAmount: number;
}

/**
 * Calculate deposit return based on contract termination rules
 */
export function calculateDepositReturn(params: DepositCalcParams): DepositCalculation {
    const { contractEnd, terminationDate, depositAmount, monthlyRent } = params;

    const termDate = new Date(terminationDate);
    const requestDate = params.requestDate ? new Date(params.requestDate) : new Date();

    // Days of notice = difference between termination date and request date
    const noticeDays = Math.ceil(
        (termDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Is contract indefinite? (past contract_end or no contract_end)
    const isIndefinite = !contractEnd || new Date(contractEnd) <= requestDate;

    // Is tenant leaving at or after contract end date?
    const isLeavingAtEnd = contractEnd
        ? termDate >= new Date(contractEnd)
        : true;

    // Is this early termination? (leaving before contract end while contract is active)
    const isEarly = !isIndefinite && !isLeavingAtEnd;

    let scenario: DepositScenario;
    let returnAmount: number;
    let deductionReason: string;
    let scenarioLabel: string;

    if (isIndefinite) {
        // ─── NETERMINUOTA SUTARTIS ───
        // Po pabaigos datos sutartis tampa neterminuota
        if (noticeDays >= 30) {
            scenario = 'indefinite_notice_ok';
            returnAmount = depositAmount;
            deductionReason = 'Nėra išskaitymų';
            scenarioLabel = 'Neterminuota sutartis · pranešta ≥30 d.';
        } else if (noticeDays > 0) {
            scenario = 'indefinite_notice_late';
            returnAmount = Math.max(0, depositAmount - monthlyRent);
            deductionReason = `Išskaičiuojama 1 mėn. nuoma (pranešta <30 d.)`;
            scenarioLabel = 'Neterminuota sutartis · pranešta <30 d.';
        } else {
            scenario = 'indefinite_no_notice';
            returnAmount = Math.max(0, depositAmount - monthlyRent);
            deductionReason = `Išskaičiuojama 1 mėn. nuoma (nepranešta)`;
            scenarioLabel = 'Neterminuota sutartis · nepranešta';
        }
    } else if (isEarly) {
        // ─── ANKSTYVAS NUTRAUKIMAS ───
        // Sutartis dar galioja, bet nuomininkas nori išsikraustyti anksčiau
        // Kiek dienų liko iki sutarties pabaigos nuo išsikėlimo datos
        const daysUntilContractEnd = contractEnd
            ? Math.ceil((new Date(contractEnd).getTime() - termDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        if (noticeDays >= 30 && daysUntilContractEnd <= 30) {
            // Pranešta ≥30d ir iki sutarties pabaigos ≤30d — beveik pabaiga
            scenario = 'active_early_notice_ok';
            returnAmount = depositAmount;
            deductionReason = 'Nėra išskaitymų (artima sutarties pabaiga)';
            scenarioLabel = 'Ankstyvas nutraukimas · pranešta ≥30 d. · ≤30 d. iki pabaigos';
        } else if (noticeDays >= 30) {
            // Pranešta ≥30d bet >30d iki sutarties pabaigos — tikras ankstyvas
            scenario = 'active_early_notice_ok';
            returnAmount = Math.round(depositAmount / 2);
            deductionReason = 'Grąžinama pusė depozito (ankstyvas nutraukimas, >30 d. iki pabaigos)';
            scenarioLabel = 'Ankstyvas nutraukimas · pranešta ≥30 d. · >30 d. iki pabaigos';
        } else if (noticeDays > 0) {
            scenario = 'active_early_notice_late';
            returnAmount = 0;
            deductionReason = 'Visas depozitas išskaičiuojamas (pranešta <30 d.)';
            scenarioLabel = 'Ankstyvas nutraukimas · pranešta <30 d.';
        } else {
            scenario = 'active_early_no_notice';
            returnAmount = 0;
            deductionReason = 'Visas depozitas išskaičiuojamas (nepranešta)';
            scenarioLabel = 'Ankstyvas nutraukimas · nepranešta';
        }
    } else {
        // ─── SUTARTIES PABAIGA ───
        // Nuomininkas išsikrausto sutarties pabaigoje arba vėliau
        if (noticeDays >= 30) {
            scenario = 'active_at_end_notice_ok';
            returnAmount = depositAmount;
            deductionReason = 'Nėra išskaitymų';
            scenarioLabel = 'Sutarties pabaiga · pranešta ≥30 d.';
        } else if (noticeDays > 0) {
            scenario = 'active_at_end_notice_late';
            returnAmount = Math.max(0, depositAmount - monthlyRent);
            deductionReason = `Išskaičiuojama 1 mėn. nuoma (pranešta <30 d.)`;
            scenarioLabel = 'Sutarties pabaiga · pranešta <30 d.';
        } else {
            scenario = 'active_at_end_no_notice';
            returnAmount = Math.max(0, depositAmount - monthlyRent);
            deductionReason = `Išskaičiuojama 1 mėn. nuoma (nepranešta)`;
            scenarioLabel = 'Sutarties pabaiga · nepranešta';
        }
    }

    return {
        returnAmount,
        deductionAmount: depositAmount - returnAmount,
        deductionReason,
        scenario,
        scenarioLabel,
        noticeDays,
        isFullReturn: returnAmount === depositAmount,
        isFullForfeit: returnAmount === 0,
    };
}

/**
 * Get all deposit rule descriptions for display in the rules info section
 */
export function getDepositRules(): Array<{
    title: string;
    description: string;
    type: 'success' | 'warning' | 'danger';
}> {
    return [
        {
            title: 'Sutarties pabaiga + pranešta ≥30 d.',
            description: 'Grąžinamas visas depozitas',
            type: 'success',
        },
        {
            title: 'Sutarties pabaiga + pranešta <30 d.',
            description: 'Išskaičiuojama 1 mėn. nuoma',
            type: 'warning',
        },
        {
            title: 'Ankstyvas nutraukimas + pranešta ≥30 d.',
            description: 'Išskaičiuojama 1 mėn. nuoma',
            type: 'warning',
        },
        {
            title: 'Ankstyvas nutraukimas + pranešta <30 d.',
            description: 'Visas depozitas prarandamas',
            type: 'danger',
        },
        {
            title: 'Neterminuota + pranešta ≥30 d.',
            description: 'Grąžinamas visas depozitas',
            type: 'success',
        },
        {
            title: 'Neterminuota + pranešta <30 d.',
            description: 'Išskaičiuojama 1 mėn. nuoma',
            type: 'warning',
        },
    ];
}

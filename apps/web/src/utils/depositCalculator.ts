/**
 * Deposit Calculator — Centralized deposit return logic
 * 
 * Simple rules:
 *   - Notice ≥30 days → full deposit returned
 *   - Notice <30 days → full deposit forfeited (0 €)
 * 
 * Additional:
 *   - Custom deductions (repairs, cleaning, etc.) are handled separately by the landlord
 *   - Deposit returned within 14 calendar days of move-out + inspection
 */

export type DepositScenario =
    | 'active_at_end_notice_ok'       // Leaving at contract end, ≥30d notice
    | 'active_at_end_notice_late'     // Leaving at contract end, <30d notice
    | 'active_early_notice_ok'        // Leaving early, ≥30d notice
    | 'active_early_notice_late'      // Leaving early, <30d notice
    | 'indefinite_notice_ok'          // Indefinite, ≥30d notice
    | 'indefinite_notice_late';       // Indefinite, <30d notice

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
    monthlyRent: number;          // kept for interface compatibility
    depositAmount: number;
}

/**
 * Calculate deposit return based on contract termination rules
 * Simple: ≥30d notice = full deposit back, <30d = forfeited
 */
export function calculateDepositReturn(params: DepositCalcParams): DepositCalculation {
    const { contractEnd, terminationDate, depositAmount } = params;

    const termDate = new Date(terminationDate);
    const requestDate = params.requestDate ? new Date(params.requestDate) : new Date();

    // Days of notice = difference between termination date and request date
    const noticeDays = Math.ceil(
        (termDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const hasProperNotice = noticeDays >= 30;

    // Is contract indefinite? (past contract_end or no contract_end)
    const isIndefinite = !contractEnd || new Date(contractEnd) <= requestDate;

    // Is tenant leaving at or after contract end date?
    const isLeavingAtEnd = contractEnd
        ? termDate >= new Date(contractEnd)
        : true;

    let scenario: DepositScenario;
    let returnAmount: number;
    let deductionReason: string;
    let scenarioLabel: string;

    if (isIndefinite) {
        // ─── INDEFINITE CONTRACT ───
        if (hasProperNotice) {
            scenario = 'indefinite_notice_ok';
            returnAmount = depositAmount;
            deductionReason = 'Nėra išskaitymų';
            scenarioLabel = 'Neterminuota sutartis · pranešta ≥30 d.';
        } else {
            scenario = 'indefinite_notice_late';
            returnAmount = 0;
            deductionReason = 'Visas depozitas išskaičiuojamas (pranešta <30 d.)';
            scenarioLabel = 'Neterminuota sutartis · pranešta <30 d.';
        }
    } else if (isLeavingAtEnd) {
        // ─── LEAVING AT CONTRACT END ───
        if (hasProperNotice) {
            scenario = 'active_at_end_notice_ok';
            returnAmount = depositAmount;
            deductionReason = 'Nėra išskaitymų';
            scenarioLabel = 'Sutarties pabaigoje · pranešta ≥30 d.';
        } else {
            scenario = 'active_at_end_notice_late';
            returnAmount = 0;
            deductionReason = 'Visas depozitas išskaičiuojamas (pranešta <30 d.)';
            scenarioLabel = 'Sutarties pabaigoje · pranešta <30 d.';
        }
    } else {
        // ─── EARLY TERMINATION ───
        if (hasProperNotice) {
            scenario = 'active_early_notice_ok';
            returnAmount = depositAmount;
            deductionReason = 'Nėra išskaitymų (pranešta ≥30 d.)';
            scenarioLabel = 'Ankstyvas nutraukimas · pranešta ≥30 d.';
        } else {
            scenario = 'active_early_notice_late';
            returnAmount = 0;
            deductionReason = 'Visas depozitas išskaičiuojamas (pranešta <30 d.)';
            scenarioLabel = 'Ankstyvas nutraukimas · pranešta <30 d.';
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
            title: 'Pranešus ≥30 d.',
            description: 'Grąžinamas visas depozitas',
            type: 'success',
        },
        {
            title: 'Pranešus <30 d.',
            description: 'Visas depozitas prarandamas',
            type: 'danger',
        },
    ];
}

/**
 * 🧾 DEPOZITO GRĄŽINIMO LOGIKA
 * Išsami depozito skaičiavimo sistema pagal Lietuvos nuomos praktiką
 * 
 * Pagrindiniai scenarijai:
 * 1. Sutartis galioja - išsikraustoma sutarties pabaigoje
 * 2. Sutartis galioja - išsikraustoma anksčiau
 * 3. Sutartis pasibaigusi (neterminuota fazė)
 * 4. Vėluojama išsikraustyti
 */

// ============================================
// 📋 TIPŲ APIBRĖŽIMAI
// ============================================

export type ContractPhase =
    | 'active'           // Sutartis galioja
    | 'indefinite'       // Sutartis pasibaigė, tapo neterminuota
    | 'expired';         // Sutartis baigėsi, nuomininkas turėjo išsikraustyti

export type MoveOutTiming =
    | 'at_contract_end'  // Išsikrausto sutarties pabaigoje
    | 'early'            // Išsikrausto anksčiau nei sutarties pabaiga
    | 'late';            // Vėluoja išsikraustyti

export type NoticeStatus =
    | 'notice_30_plus'   // Pranešė ≥30 dienų prieš
    | 'notice_under_30'  // Pranešė <30 dienų prieš
    | 'no_notice';       // Nepranešė

export interface DepositInfo {
    depositAmount: number;          // Pilna depozito suma
    depositPaidAmount: number;      // Sumokėta depozito suma
    monthlyRent: number;            // Mėnesio nuoma
    contractStartDate: string;      // Sutarties pradžia
    contractEndDate: string;        // Sutarties pabaiga
    moveOutNoticeDate?: string;     // Pranešimo apie išsikraustymą data
    plannedMoveOutDate?: string;    // Planuojama išsikraustymo data
    actualMoveOutDate?: string;     // Faktinė išsikraustymo data
    inspectionDate?: string;        // Patikros data
    dailyLateFee?: number;          // Dienos mokestis už vėlavimą (default: 50€)
}

export interface OutstandingObligations {
    unpaidBills: number;            // Neapmokėtos sąskaitos
    inventoryDamage: number;        // Inventoriaus sugadinimai
    cleaningCost: number;           // Valymo išlaidos
    otherDebts: number;             // Kitos skolos
}

export interface DepositCalculationResult {
    // Pagrindinė informacija
    originalDeposit: number;
    paidDeposit: number;

    // Išskaitymai pagal pranešimo taisykles
    noticeDeduction: number;
    noticeDeductionReason: string;

    // Vėlavimo mokestis (NESKAIČIUOJAMAS IŠ DEPOZITO)
    lateFee: number;
    lateDays: number;

    // Grąžintina suma
    refundableAmount: number;

    // Ar galima grąžinti
    canRefund: boolean;
    blockingReasons: string[];

    // Nuomininko įsipareigojimai (turi padengti pats)
    outstandingObligations: OutstandingObligations;
    totalObligations: number;

    // Grąžinimo terminas
    refundDeadline: string | null;

    // Detalus paaiškinimas
    explanation: string;
    scenario: string;
}

// ============================================
// 🔧 PAGALBINĖS FUNKCIJOS
// ============================================

/**
 * Apskaičiuoja dienų skaičių tarp dviejų datų
 */
export function daysBetween(date1: string | Date, date2: string | Date): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Prideda dienas prie datos
 */
export function addDays(date: string | Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Formatuoja datą lietuviškai
 */
export function formatDateLT(date: string | Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Nustato sutarties fazę
 */
export function getContractPhase(contractEndDate: string, today: Date = new Date()): ContractPhase {
    const endDate = new Date(contractEndDate);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDateStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    if (todayStart <= endDateStart) {
        return 'active';
    }
    // Po sutarties pabaigos - neterminuota fazė
    return 'indefinite';
}

/**
 * Nustato pranešimo statusą
 */
export function getNoticeStatus(
    noticeDate: string | undefined,
    targetDate: string,  // Išsikraustymo data arba sutarties pabaiga
): NoticeStatus {
    if (!noticeDate) {
        return 'no_notice';
    }

    const daysNotice = daysBetween(noticeDate, targetDate);

    if (daysNotice >= 30) {
        return 'notice_30_plus';
    }
    return 'notice_under_30';
}

/**
 * Nustato išsikraustymo laiką
 */
export function getMoveOutTiming(
    plannedMoveOutDate: string | undefined,
    contractEndDate: string,
    today: Date = new Date()
): MoveOutTiming {
    if (!plannedMoveOutDate) {
        // Jei nėra planuojamos datos, žiūrim ar sutartis pasibaigė
        const phase = getContractPhase(contractEndDate, today);
        if (phase === 'indefinite') {
            return 'late'; // Sutartis pasibaigė, bet dar neišsikraustė
        }
        return 'at_contract_end'; // Tikėtina, kad išsikraustys sutarties pabaigoje
    }

    const moveOut = new Date(plannedMoveOutDate);
    const contractEnd = new Date(contractEndDate);

    if (moveOut.getTime() === contractEnd.getTime()) {
        return 'at_contract_end';
    }
    if (moveOut < contractEnd) {
        return 'early';
    }
    return 'late';
}

// ============================================
// 📊 PAGRINDINĖ SKAIČIAVIMO FUNKCIJA
// ============================================

/**
 * Apskaičiuoja depozito grąžinimą pagal visas taisykles
 */
export function calculateDepositReturn(
    deposit: DepositInfo,
    obligations: OutstandingObligations = { unpaidBills: 0, inventoryDamage: 0, cleaningCost: 0, otherDebts: 0 },
    today: Date = new Date()
): DepositCalculationResult {
    const {
        depositAmount,
        depositPaidAmount,
        monthlyRent,
        contractEndDate,
        moveOutNoticeDate,
        plannedMoveOutDate,
        actualMoveOutDate,
        inspectionDate,
        dailyLateFee = 50
    } = deposit;

    // Baziniai skaičiavimai
    const paidDeposit = depositPaidAmount || depositAmount;
    const contractPhase = getContractPhase(contractEndDate, today);
    const moveOutTiming = getMoveOutTiming(plannedMoveOutDate, contractEndDate, today);

    // Nustatome tikslią išsikraustymo datą
    const effectiveMoveOutDate = actualMoveOutDate || plannedMoveOutDate || contractEndDate;

    // Pranešimo statusas
    const noticeStatus = getNoticeStatus(moveOutNoticeDate, effectiveMoveOutDate);

    // Skaičiuojame išskaitymus pagal scenarijų
    let noticeDeduction = 0;
    let noticeDeductionReason = '';
    let scenario = '';
    let explanation = '';

    // ============================================
    // SCENARIJUS 1: Sutartis galioja, išsikrausto pabaigoje
    // ============================================
    if (contractPhase === 'active' && moveOutTiming === 'at_contract_end') {
        scenario = 'Sutartis galioja - išsikrausto sutarties pabaigoje';

        switch (noticeStatus) {
            case 'notice_30_plus':
                noticeDeduction = 0;
                noticeDeductionReason = 'Pranešė ≥30 dienų prieš sutarties pabaigą';
                explanation = '✅ Grąžinamas visas depozitas - nuomininkas pranešė laiku.';
                break;
            case 'notice_under_30':
                noticeDeduction = monthlyRent;
                noticeDeductionReason = 'Pranešė <30 dienų prieš sutarties pabaigą';
                explanation = `⚠️ Išskaičiuojama 1 mėn. nuoma (${monthlyRent}€) - per vėlai pranešta.`;
                break;
            case 'no_notice':
                noticeDeduction = monthlyRent;
                noticeDeductionReason = 'Nepranešė apie išsikraustymą';
                explanation = `⚠️ Išskaičiuojama 1 mėn. nuoma (${monthlyRent}€) - nuomininkas nepranešė.`;
                break;
        }
    }

    // ============================================
    // SCENARIJUS 2: Sutartis galioja, išsikrausto anksčiau
    // ============================================
    else if (contractPhase === 'active' && moveOutTiming === 'early') {
        scenario = 'Sutartis galioja - išsikrausto anksčiau nei sutarties pabaiga';

        switch (noticeStatus) {
            case 'notice_30_plus':
                noticeDeduction = monthlyRent;
                noticeDeductionReason = 'Ankstyvasis išsikraustymas su ≥30 dienų pranešimu';
                explanation = `⚠️ Išskaičiuojama 1 mėn. nuoma (${monthlyRent}€) - ankstyvas išsikraustymas, bet pranešta laiku.`;
                break;
            case 'notice_under_30':
                noticeDeduction = paidDeposit;
                noticeDeductionReason = 'Ankstyvasis išsikraustymas su <30 dienų pranešimu';
                explanation = `🛑 Išskaičiuojamas visas depozitas (${paidDeposit}€) - ankstyvas išsikraustymas be tinkamo pranešimo.`;
                break;
            case 'no_notice':
                noticeDeduction = paidDeposit;
                noticeDeductionReason = 'Ankstyvasis išsikraustymas be pranešimo';
                explanation = `🛑 Išskaičiuojamas visas depozitas (${paidDeposit}€) - ankstyvas išsikraustymas be jokio pranešimo.`;
                break;
        }
    }

    // ============================================
    // SCENARIJUS 3: Neterminuota fazė
    // ============================================
    else if (contractPhase === 'indefinite') {
        scenario = 'Sutartis pasibaigusi (neterminuota fazė)';

        switch (noticeStatus) {
            case 'notice_30_plus':
                noticeDeduction = 0;
                noticeDeductionReason = 'Neterminuota sutartis - pranešė ≥30 dienų prieš';
                explanation = '✅ Grąžinamas visas depozitas - neterminuotoje fazėje pranešė laiku.';
                break;
            case 'notice_under_30':
                noticeDeduction = monthlyRent;
                noticeDeductionReason = 'Neterminuota sutartis - pranešė <30 dienų prieš';
                explanation = `⚠️ Išskaičiuojama 1 mėn. nuoma (${monthlyRent}€) - per vėlai pranešta.`;
                break;
            case 'no_notice':
                noticeDeduction = monthlyRent;
                noticeDeductionReason = 'Neterminuota sutartis - nepranešė';
                explanation = `⚠️ Išskaičiuojama 1 mėn. nuoma (${monthlyRent}€) - nepranešė apie išsikraustymą.`;
                break;
        }
    }

    // ============================================
    // VĖLAVIMO MOKESTIS (neskaičiuojamas iš depozito)
    // ============================================
    let lateFee = 0;
    let lateDays = 0;

    if (actualMoveOutDate && plannedMoveOutDate) {
        lateDays = daysBetween(plannedMoveOutDate, actualMoveOutDate);
        if (lateDays > 0) {
            lateFee = lateDays * dailyLateFee;
            explanation += `\n\n📅 Vėlavimo mokestis: ${lateDays} d. × ${dailyLateFee}€ = ${lateFee}€ (skaičiuojama atskirai, NE iš depozito).`;
        }
    }

    // ============================================
    // NUOMININKO ĮSIPAREIGOJIMAI
    // ============================================
    const totalObligations =
        obligations.unpaidBills +
        obligations.inventoryDamage +
        obligations.cleaningCost +
        obligations.otherDebts;

    // ============================================
    // GALUTINIS SKAIČIAVIMAS
    // ============================================
    const refundableAmount = Math.max(0, paidDeposit - noticeDeduction);

    // Ar galima grąžinti depozitą?
    const blockingReasons: string[] = [];

    if (obligations.unpaidBills > 0) {
        blockingReasons.push(`Neapmokėtos sąskaitos: ${obligations.unpaidBills}€`);
    }
    if (obligations.inventoryDamage > 0) {
        blockingReasons.push(`Inventoriaus sugadinimai: ${obligations.inventoryDamage}€`);
    }
    if (obligations.cleaningCost > 0) {
        blockingReasons.push(`Valymo išlaidos: ${obligations.cleaningCost}€`);
    }
    if (obligations.otherDebts > 0) {
        blockingReasons.push(`Kitos skolos: ${obligations.otherDebts}€`);
    }

    const canRefund = blockingReasons.length === 0 && refundableAmount > 0;

    // Grąžinimo terminas (14 dienų nuo patikros)
    let refundDeadline: string | null = null;
    if (inspectionDate && canRefund) {
        refundDeadline = addDays(inspectionDate, 14).toISOString().split('T')[0];
    } else if (actualMoveOutDate && canRefund) {
        refundDeadline = addDays(actualMoveOutDate, 14).toISOString().split('T')[0];
    }

    // Galutinis paaiškinimas
    if (blockingReasons.length > 0) {
        explanation += '\n\n🛑 DEPOZITAS NEGALI BŪTI GRĄŽINTAS, kol nuomininkas nepadengs:';
        blockingReasons.forEach(reason => {
            explanation += `\n   • ${reason}`;
        });
        explanation += '\n\n💡 Depozitas negali būti naudojamas šiems įsipareigojimams padengti automatiškai.';
    }

    if (refundDeadline && canRefund) {
        explanation += `\n\n⏱️ Depozitas turi būti grąžintas iki ${formatDateLT(refundDeadline)} (14 dienų nuo patikros).`;
    }

    return {
        originalDeposit: depositAmount,
        paidDeposit,
        noticeDeduction,
        noticeDeductionReason,
        lateFee,
        lateDays,
        refundableAmount,
        canRefund,
        blockingReasons,
        outstandingObligations: obligations,
        totalObligations,
        refundDeadline,
        explanation,
        scenario
    };
}

// ============================================
// 🎨 UI HELPER FUNKCIJOS
// ============================================

/**
 * Grąžina spalvą pagal grąžinimo statusą
 */
export function getDepositStatusColor(result: DepositCalculationResult): string {
    if (!result.canRefund) {
        return 'red';
    }
    if (result.noticeDeduction > 0) {
        return 'amber';
    }
    return 'emerald';
}

/**
 * Grąžina ikonos pavadinimą pagal statusą
 */
export function getDepositStatusIcon(result: DepositCalculationResult): 'check' | 'warning' | 'x' {
    if (!result.canRefund) {
        return 'x';
    }
    if (result.noticeDeduction > 0) {
        return 'warning';
    }
    return 'check';
}

/**
 * Formatuoja sumą lietuviškai
 */
export function formatCurrency(amount: number): string {
    return amount.toLocaleString('lt-LT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' €';
}

// ============================================
// 📝 DEPOZITO SANTRAUKOS GENERAVIMAS
// ============================================

export interface DepositSummaryData {
    title: string;
    subtitle: string;
    depositPaid: string;
    deduction: string;
    deductionReason: string;
    refundable: string;
    status: 'success' | 'warning' | 'error';
    statusText: string;
    deadline: string | null;
    obligations: Array<{ label: string; amount: string }>;
    canRefund: boolean;
}

export function generateDepositSummary(result: DepositCalculationResult): DepositSummaryData {
    const obligations = [
        { label: 'Neapmokėtos sąskaitos', amount: formatCurrency(result.outstandingObligations.unpaidBills) },
        { label: 'Inventoriaus žala', amount: formatCurrency(result.outstandingObligations.inventoryDamage) },
        { label: 'Valymo išlaidos', amount: formatCurrency(result.outstandingObligations.cleaningCost) },
        { label: 'Kitos skolos', amount: formatCurrency(result.outstandingObligations.otherDebts) },
    ].filter(o => parseFloat(o.amount) > 0);

    let status: 'success' | 'warning' | 'error';
    let statusText: string;

    if (!result.canRefund) {
        status = 'error';
        statusText = 'Negalima grąžinti';
    } else if (result.noticeDeduction > 0) {
        status = 'warning';
        statusText = 'Grąžinama su išskaitymu';
    } else {
        status = 'success';
        statusText = 'Pilnas grąžinimas';
    }

    return {
        title: 'Depozito santrauka',
        subtitle: result.scenario,
        depositPaid: formatCurrency(result.paidDeposit),
        deduction: formatCurrency(result.noticeDeduction),
        deductionReason: result.noticeDeductionReason,
        refundable: formatCurrency(result.refundableAmount),
        status,
        statusText,
        deadline: result.refundDeadline ? formatDateLT(result.refundDeadline) : null,
        obligations,
        canRefund: result.canRefund
    };
}

// ============================================
// 🧪 TESTAVIMO FUNKCIJOS
// ============================================

/**
 * Testavimo pavyzdžiai
 */
export const depositTestCases = {
    // Scenarijus 1: Pranešė laiku, išsikrausto pabaigoje
    scenario1_fullRefund: {
        deposit: {
            depositAmount: 1000,
            depositPaidAmount: 1000,
            monthlyRent: 500,
            contractStartDate: '2024-01-01',
            contractEndDate: '2025-01-01',
            moveOutNoticeDate: '2024-11-25', // 37 dienos prieš
            plannedMoveOutDate: '2025-01-01',
        },
        obligations: { unpaidBills: 0, inventoryDamage: 0, cleaningCost: 0, otherDebts: 0 },
        expectedRefund: 1000,
        expectedDeduction: 0,
    },

    // Scenarijus 2: Pranešė per vėlai
    scenario2_lateNotice: {
        deposit: {
            depositAmount: 1000,
            depositPaidAmount: 1000,
            monthlyRent: 500,
            contractStartDate: '2024-01-01',
            contractEndDate: '2025-01-01',
            moveOutNoticeDate: '2024-12-20', // 12 dienų prieš
            plannedMoveOutDate: '2025-01-01',
        },
        obligations: { unpaidBills: 0, inventoryDamage: 0, cleaningCost: 0, otherDebts: 0 },
        expectedRefund: 500,
        expectedDeduction: 500,
    },

    // Scenarijus 3: Ankstyvas išsikraustymas be pranešimo
    scenario3_earlyNoNotice: {
        deposit: {
            depositAmount: 1000,
            depositPaidAmount: 1000,
            monthlyRent: 500,
            contractStartDate: '2024-01-01',
            contractEndDate: '2025-01-01',
            plannedMoveOutDate: '2024-10-01', // 3 mėn. anksčiau
        },
        obligations: { unpaidBills: 0, inventoryDamage: 0, cleaningCost: 0, otherDebts: 0 },
        expectedRefund: 0,
        expectedDeduction: 1000,
    },

    // Scenarijus 4: Yra neapmokėtų sąskaitų
    scenario4_outstandingBills: {
        deposit: {
            depositAmount: 1000,
            depositPaidAmount: 1000,
            monthlyRent: 500,
            contractStartDate: '2024-01-01',
            contractEndDate: '2025-01-01',
            moveOutNoticeDate: '2024-11-25',
            plannedMoveOutDate: '2025-01-01',
        },
        obligations: { unpaidBills: 150, inventoryDamage: 0, cleaningCost: 50, otherDebts: 0 },
        canRefund: false,
    },
};

export default {
    calculateDepositReturn,
    getContractPhase,
    getNoticeStatus,
    getMoveOutTiming,
    generateDepositSummary,
    formatCurrency,
    daysBetween,
    addDays,
    formatDateLT,
    getDepositStatusColor,
    getDepositStatusIcon,
    depositTestCases,
};

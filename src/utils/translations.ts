export interface SatimMessage {
  en: string;
  ar: string;
  fr: string;
}

/**
 * Mapping of SATIM/ISO-8583 Action Codes to localized messages.
 */
export const ERROR_MAPPINGS: Record<number, SatimMessage> = {
  0: {
    en: 'Approved / Valid Card',
    ar: 'تمت الموافقة / بطاقة صالحة',
    fr: 'Approuvé / Carte valide',
  },
  101: {
    en: 'Expired card',
    ar: 'بطاقة منتهية الصلاحية',
    fr: 'Carte expirée',
  },
  111: {
    en: 'Invalid cardholder name',
    ar: 'اسم صاحب البطاقة غير صالح',
    fr: 'Nom du porteur invalide',
  },
  116: {
    en: 'Insufficient card balance',
    ar: 'رصيد البطاقة غير كافٍ',
    fr: 'Solde insuffisant',
  },
  117: {
    en: 'Incorrect CVV2',
    ar: 'رمز CVV2 غير صحيح',
    fr: 'CVV2 incorrect',
  },
  119: {
    en: 'Card not authorized for online payment service',
    ar: 'البطاقة غير مصرح لها بخدمة الدفع عبر الإنترنت',
    fr: 'Carte non autorisée pour le paiement en ligne',
  },
  120: {
    en: 'Terminal or amount limit exceeded',
    ar: 'تجاوز حد المحطة أو المبلغ',
    fr: 'Limite du terminal ou du montant dépassée',
  },
  121: {
    en: 'Card limit exceeded',
    ar: 'تجاوز حد البطاقة',
    fr: 'Limite de la carte dépassée',
  },
  125: {
    en: 'Card not active and valid for online payment service',
    ar: 'البطاقة غير نشطة وصالحة لخدمة الدفع عبر الإنترنت',
    fr: 'Carte inactive ou invalide pour le paiement en ligne',
  },
  157: {
    en: 'Incorrect expiration date entry',
    ar: 'إدخال تاريخ انتهاء غير صحيح',
    fr: "Date d'expiration saisie incorrecte",
  },
  200: {
    en: "Card no longer exists on the issuer's server",
    ar: 'البطاقة لم تعد موجودة في خادم المصدر',
    fr: "La carte n'existe plus sur le serveur de l'émetteur",
  },
  208: {
    en: 'LOST card',
    ar: 'بطاقة مفقودة',
    fr: 'Carte perdue',
  },
  209: {
    en: 'STOLEN card',
    ar: 'بطاقة مسروقة',
    fr: 'Carte volée',
  },
  210: {
    en: 'TEMPORARILY BLOCKED',
    ar: 'موقوفة مؤقتاً',
    fr: 'Carte temporairement bloquée',
  },
  380: {
    en: 'Exceeded allowed number of passwords',
    ar: 'تجاوز عدد كلمات المرور المسموح به',
    fr: 'Nombre de mots de passe autorisé dépassé',
  },
};

/**
 * Get a localized error message based on SATIM actionCode.
 * Falls back to French when the language is unrecognized.
 */
export function getLocalizedMessage(actionCode: number, lang = 'fr'): string {
  const mapping = ERROR_MAPPINGS[actionCode];
  if (!mapping) return 'Unknown Error / خطأ غير معروف';

  const l = lang.toLowerCase();
  if (l.startsWith('ar')) return mapping.ar;
  if (l.startsWith('en')) return mapping.en;
  return mapping.fr;
}

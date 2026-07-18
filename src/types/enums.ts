export enum SatimCurrency {
  DZD = '012',
}

export enum SatimLanguage {
  AR = 'AR',
  FR = 'FR',
  EN = 'EN',
}

export enum OrderStatus {
  /** Order registered but not paid */
  REGISTERED = 0,
  /** Pre-authorized amount held */
  PRE_AUTHORIZED = 1,
  /** Full authorization complete */
  AUTHORIZED = 2,
  /** Authorization cancelled */
  CANCELLED = 3,
  /** Transaction reversed */
  REVERSED = 4,
  /** Transaction initiated but not confirmed by the bank */
  INITIATED = 5,
  /** Transaction declined */
  DECLINED = 6,
}

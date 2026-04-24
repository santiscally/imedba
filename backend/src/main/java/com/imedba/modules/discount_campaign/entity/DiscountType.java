package com.imedba.modules.discount_campaign.entity;

/**
 * Tipo de descuento aplicado por una campaña.
 *   PERCENTAGE   — discount_value es un porcentaje (0–100).
 *   FIXED_AMOUNT — discount_value es un monto absoluto en ARS.
 */
public enum DiscountType {
    PERCENTAGE,
    FIXED_AMOUNT
}

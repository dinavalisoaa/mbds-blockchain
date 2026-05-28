export const CATEGORIES = [
  'TECHNOLOGY', 'ART', 'SOCIAL', 'ENVIRONMENT',
  'EDUCATION', 'MUSIC', 'FILM', 'GAMING', 'FOOD_TECH', 'OTHER',
];

export const TX_LABELS = {
  contribute:     { pending: 'CONTRIBUTION_PENDING...',   success: 'CONTRIBUTION_CONFIRMED' },
  withdraw:       { pending: 'WITHDRAWAL_PENDING...',     success: 'FUNDS_WITHDRAWN' },
  refund:         { pending: 'REFUND_PENDING...',         success: 'REFUND_RECEIVED' },
  cancelCampaign: { pending: 'CANCELLATION_PENDING...',   success: 'CAMPAIGN_CANCELLED' },
  createCampaign: { pending: 'DEPLOYING_CAMPAIGN...',     success: 'CAMPAIGN_DEPLOYED' },
  refundAll:      { pending: 'REFUNDS_PROCESSING...',     success: 'REFUNDS_COMPLETE' },
};

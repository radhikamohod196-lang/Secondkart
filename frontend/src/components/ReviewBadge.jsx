// Photo-review status shown on listings. These are signals for manual review, never proof of authenticity.
export const REVIEW_BADGES = {
  'Pending Review': ['Pending Review', 'warn'],
  'Review Recommended': ['Review Recommended', 'bad'],
  'Signal Detected': ['Signal Detected (not proof)', 'bad'],
  'Inconclusive': ['Inconclusive', 'warn'],
  'Approved by Admin': ['Approved by Admin', 'good']
};

export default function ReviewBadge({ status = 'Pending Review', className = '' }) {
  const [label, tone] = REVIEW_BADGES[status] || REVIEW_BADGES['Pending Review'];
  return <span className={`review-chip rc-${tone} ${className}`}>{label}</span>;
}

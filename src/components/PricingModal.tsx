import { Modal } from './Modal'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    licenseCount: '1 license',
    monthly: '€99',
    yearly: '€1,000',
    yearlyLabel: '/year',
    cta: 'Get Pro',
  },
  {
    id: 'team',
    name: 'Team',
    licenseCount: 'Up to 5 licenses',
    monthly: '€299',
    yearly: '€3,000',
    yearlyLabel: '/year',
    cta: 'Get Team',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    licenseCount: 'Unlimited users',
    monthly: null,
    yearly: '€7,500',
    yearlyLabel: '/year only',
    cta: 'Contact Sales',
  },
]

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pro License" contentClassName="modal-content-wide">
      <div className="pricing-table">
        <div className="pricing-plans">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-plan ${plan.popular ? 'pricing-plan-popular' : ''}`}
            >
              {plan.popular && <span className="pricing-badge">Popular</span>}
              <h3 className="pricing-plan-name">{plan.name}</h3>
              <p className="pricing-license-count">{plan.licenseCount}</p>
              <div className="pricing-amounts">
                {plan.monthly && (
                  <span className="pricing-monthly">{plan.monthly}/month</span>
                )}
                <span className="pricing-yearly">
                  {plan.yearly}
                  <span className="pricing-yearly-label">{plan.yearlyLabel}</span>
                </span>
              </div>
              <button type="button" className="btn btn-primary pricing-cta">
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

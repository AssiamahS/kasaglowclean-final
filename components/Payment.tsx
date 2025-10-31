import React, { useState, useEffect, useRef } from 'react';
import type { BookingDetails } from '../types';
import { CalendarIcon, MailIcon, CreditCardIcon, PayPalIcon, LockClosedIcon } from './IconComponents';

interface PaymentProps {
  details: Required<Pick<BookingDetails, 'service' | 'dateTime' | 'customer'>>;
  onConfirm: () => void;
}

// Allow window to have a 'paypal' property
declare global {
  interface Window {
    paypal: any;
  }
}

const Payment: React.FC<PaymentProps> = ({ details, onConfirm }) => {
  const { service, dateTime, customer } = details;
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [errors, setErrors] = useState<Partial<typeof cardDetails>>({});

  const paypalButtonContainerRef = useRef<HTMLDivElement>(null);

  const validateCardDetails = () => {
    const newErrors: Partial<typeof cardDetails> = {};
    if (!cardDetails.name) newErrors.name = 'Name is required';
    if (!cardDetails.number || cardDetails.number.length < 15) newErrors.number = 'Invalid card number';
    if (!cardDetails.expiry || !/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(cardDetails.expiry)) newErrors.expiry = 'Invalid expiry date (MM/YY)';
    if (!cardDetails.cvc || cardDetails.cvc.length < 3) newErrors.cvc = 'Invalid CVC';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleCardPayment = () => {
    if (validateCardDetails()) {
      setIsProcessing(true);
      setTimeout(() => {
        onConfirm();
        setIsProcessing(false);
      }, 2000);
    }
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setCardDetails(prev => ({...prev, [name]: value}));
  };

  useEffect(() => {
    if (paymentMethod === 'paypal' && paypalButtonContainerRef.current && window.paypal) {
        paypalButtonContainerRef.current.innerHTML = ''; // Clear previous button
        window.paypal.Buttons({
            createOrder: (data: any, actions: any) => {
                return actions.order.create({
                    purchase_units: [{
                        description: `${service.name} - Reservation Fee`,
                        amount: {
                            currency_code: 'USD',
                            value: service.reservationFee.toFixed(2)
                        }
                    }]
                });
            },
            onApprove: async (data: any, actions: any) => {
                const order = await actions.order.capture();
                console.log('PayPal Order successful:', order);
                onConfirm();
            },
            onError: (err: any) => {
                console.error('PayPal Checkout onError', err);
            }
        }).render(paypalButtonContainerRef.current);
    }
  }, [paymentMethod, service, onConfirm]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Confirm and Pay</h2>
      
      <div className="bg-base-200/50 rounded-lg p-6 border border-base-300 mb-8">
        <h3 className="text-xl font-bold mb-4">Review Your Booking</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-600">Service</p>
            <p className="text-lg font-bold text-gray-800">{service.name}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">Contact</p>
            <div className="flex items-center text-gray-800 truncate">
              <MailIcon className="h-5 w-5 mr-2 text-neutral flex-shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          </div>
          <div className="col-span-full">
            <p className="text-sm font-semibold text-gray-600">Date & Time</p>
            <div className="flex items-center text-gray-800">
              <CalendarIcon className="h-5 w-5 mr-2 text-neutral" />
              <span>{dateTime.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}, {dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-base-300 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Reservation Fee Due</span>
            <span className="text-2xl font-bold text-primary">${service.reservationFee.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-base-200">
        <div className="flex border-b border-base-300">
            <button onClick={() => setPaymentMethod('card')} className={`flex-1 p-4 font-semibold flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'card' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-neutral hover:bg-base-200'}`}>
                <CreditCardIcon className="h-6 w-6"/> Credit/Debit Card
            </button>
            <button onClick={() => setPaymentMethod('paypal')} className={`flex-1 p-4 font-semibold flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'paypal' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-neutral hover:bg-base-200'}`}>
                <PayPalIcon className="h-6 w-6"/> PayPal
            </button>
        </div>
        <div className="p-6">
            {paymentMethod === 'card' && (
                <div className="space-y-4">
                    <InputField label="Cardholder Name" name="name" value={cardDetails.name} onChange={handleCardChange} error={errors.name} />
                    <InputField label="Card Number" name="number" value={cardDetails.number} onChange={handleCardChange} error={errors.number} icon={<LockClosedIcon className="h-5 w-5"/>} />
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Expiry (MM/YY)" name="expiry" value={cardDetails.expiry} onChange={handleCardChange} error={errors.expiry} />
                        <InputField label="CVC" name="cvc" value={cardDetails.cvc} onChange={handleCardChange} error={errors.cvc} />
                    </div>
                     <div className="pt-4 flex justify-end">
                        <button
                          onClick={handleCardPayment}
                          disabled={isProcessing}
                          className="w-full sm:w-auto px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-focus disabled:bg-gray-400 flex items-center justify-center transition-colors"
                        >
                          {isProcessing ? 'Processing...' : `Pay $${service.reservationFee.toFixed(2)}`}
                        </button>
                    </div>
                </div>
            )}
            {paymentMethod === 'paypal' && (
                <div>
                    <p className="text-center text-neutral mb-4">Click below to complete your payment with PayPal.</p>
                    <div ref={paypalButtonContainerRef} className="flex justify-center"></div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const InputField: React.FC<{label: string, name: string, value: string, error?: string, icon?: React.ReactNode, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, name, value, error, icon, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 relative">
            <input
                id={name}
                name={name}
                type="text"
                value={value}
                onChange={onChange}
                className={`block w-full px-3 py-2 border rounded-md focus:outline-none sm:text-sm ${error ? 'border-error' : 'border-gray-300 focus:ring-primary focus:border-primary'} ${icon ? 'pl-10' : ''}`}
            />
            {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">{icon}</div>}
        </div>
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
)

export default Payment;

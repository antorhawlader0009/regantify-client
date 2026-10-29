import { useEffect, useState } from 'react';
import type { DesignSettings } from '../../../../lib/designSettingsApi';
import { DesignLoading, DesignPageHeader, DesignSection, RadioGroup, SaveButton, useDesignSettings } from './designShared';

type OptionalRule = DesignSettings['checkoutAltPhone'];
type ThanaRule = DesignSettings['checkoutThana'];
type NoteRule = DesignSettings['checkoutNote'];

/**
 * Store > Checkout > Form fields (TellMe idea 128): which extra boxes StorePal's checkout asks. Name, phone, district and address are always asked (delivery,
 * the zone and its charge, and the duplicate check depend on them), and a pickup order never asks the address or thana. A shorter form means more finished
 * orders. The defaults are the form as it is now. Only the StorePal checkout; the store's own Add Order is not affected.
 */
export default function CheckoutFormFields() {
  const { settings, isLoading, save } = useDesignSettings();
  const [alt, setAlt] = useState<OptionalRule>('HIDDEN');
  const [email, setEmail] = useState<OptionalRule>('HIDDEN');
  const [thana, setThana] = useState<ThanaRule>('OPTIONAL');
  const [note, setNote] = useState<NoteRule>('SHOWN');
  // Shopper sign-up asks for an SMS code: off by default (the owner's rule, 2026-10-29).
  const [signupOtp, setSignupOtp] = useState<'OFF' | 'ON'>('OFF');

  useEffect(() => {
    if (!settings) return;
    setAlt(settings.checkoutAltPhone ?? 'HIDDEN');
    setEmail(settings.checkoutEmail ?? 'HIDDEN');
    setThana(settings.checkoutThana ?? 'OPTIONAL');
    setNote(settings.checkoutNote ?? 'SHOWN');
    setSignupOtp(settings.customerSignupOtp ? 'ON' : 'OFF');
  }, [settings]);

  return (
    <div className="max-w-3xl">
      <DesignPageHeader title="Checkout Form Fields" description="Choose which boxes your StorePal checkout asks, and which are required." />
      {isLoading || !settings ? (
        <DesignLoading />
      ) : (
        <div className="space-y-8">
          <DesignSection title="Always asked" hint="Name, phone, district and address are needed to deliver, to work out the delivery charge and to spot duplicate orders, so they can’t be turned off.">
            <p className="text-sm text-regantify-text-muted">Name · Phone · District · Address (not for a pickup order)</p>
          </DesignSection>

          <DesignSection title="Extra boxes">
            <RadioGroup
              label="Second phone number"
              value={alt}
              onChange={setAlt}
              options={[
                { value: 'HIDDEN', label: 'Not asked' },
                { value: 'OPTIONAL', label: 'Optional' },
                { value: 'REQUIRED', label: 'Required' },
              ]}
              hint="A number the courier can try if the first one does not answer."
            />
            <RadioGroup
              label="Thana / area"
              value={thana}
              onChange={setThana}
              options={[
                { value: 'OPTIONAL', label: 'Optional' },
                { value: 'REQUIRED', label: 'Required' },
              ]}
              hint="Not asked for a pickup order."
            />
            <RadioGroup
              label="Email"
              value={email}
              onChange={setEmail}
              options={[
                { value: 'HIDDEN', label: 'Not asked' },
                { value: 'OPTIONAL', label: 'Optional' },
                { value: 'REQUIRED', label: 'Required' },
              ]}
              hint="Saved on the order. Shoppers are identified by phone, so most stores leave this off."
            />
            <RadioGroup
              label="Order note"
              value={note}
              onChange={setNote}
              options={[
                { value: 'SHOWN', label: 'Shown' },
                { value: 'HIDDEN', label: 'Hidden' },
              ]}
              hint="The free-text box for a message to the store. Hidden: the box is gone and a note is not kept."
            />
            <SaveButton
              pending={save.isPending}
              onClick={() => save.mutate({ checkoutAltPhone: alt, checkoutEmail: email, checkoutThana: thana, checkoutNote: note })}
            />
          </DesignSection>

          <DesignSection
            title="Customer accounts"
            hint="When a shopper creates an account on your store. Logging in with a password never asks for a code."
          >
            <RadioGroup
              label="Verify the phone with an SMS code at sign-up"
              value={signupOtp}
              onChange={setSignupOtp}
              options={[
                { value: 'OFF', label: 'Off (sign up at once)' },
                { value: 'ON', label: 'On (send a code first)' },
              ]}
              hint="Off: the account is ready right away. Reward points, wholesale prices and personal coupons only work after the shopper proves the phone with a code once (for example with OTP login). On: the shopper types a code sent by SMS before the account is made. The code is sent by Regantify, not from your SMS credits."
            />
            <SaveButton pending={save.isPending} onClick={() => save.mutate({ customerSignupOtp: signupOtp === 'ON' })} />
          </DesignSection>
        </div>
      )}
    </div>
  );
}

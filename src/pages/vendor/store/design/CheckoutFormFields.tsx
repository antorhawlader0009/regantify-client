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

  useEffect(() => {
    if (!settings) return;
    setAlt(settings.checkoutAltPhone ?? 'HIDDEN');
    setEmail(settings.checkoutEmail ?? 'HIDDEN');
    setThana(settings.checkoutThana ?? 'OPTIONAL');
    setNote(settings.checkoutNote ?? 'SHOWN');
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
        </div>
      )}
    </div>
  );
}

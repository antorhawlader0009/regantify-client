import { useEffect, useState } from 'react';
import type { StoreLayoutType, StoreMenuItem } from '../../../../lib/designSettingsApi';
import { toast } from '../../../../lib/toast';
import { MenuEditor } from './MenuEditor';
import { DesignLoading, DesignPageHeader, DesignSection, RadioGroup, SaveButton, menuError, useDesignSettings } from './designShared';

/** Store > Design > Layout Settings — page width and the desktop site menu of the StorePal storefront. */
export default function LayoutSettings() {
  const { settings, isLoading, save } = useDesignSettings();
  const [layoutType, setLayoutType] = useState<StoreLayoutType>('COMPACT');
  const [siteMenu, setSiteMenu] = useState<StoreMenuItem[]>([]);

  useEffect(() => {
    if (!settings) return;
    setLayoutType(settings.layoutType);
    setSiteMenu(settings.siteMenu);
  }, [settings]);

  const saveMenu = () => {
    const error = menuError(siteMenu);
    if (error) {
      toast.error(error);
      return;
    }
    save.mutate({ siteMenu });
  };

  return (
    <div className="max-w-4xl">
      <DesignPageHeader title="Layout Settings" description="Page width and main menu of your StorePal storefront." />
      {isLoading || !settings ? (
        <DesignLoading />
      ) : (
        <div className="space-y-8">
          <DesignSection title="Site Layout">
            <RadioGroup
              label="Layout Type"
              value={layoutType}
              onChange={setLayoutType}
              options={[
                { value: 'COMPACT', label: 'Compact' },
                { value: 'EXTENDED', label: 'Extended / Full-width' },
              ]}
            />
            <p className="text-xs text-regantify-text-muted -mt-3">
              Compact layouts have margins on both sides, suitable for modern designs. Extended / Full-width layouts
              work best for grocery and similar stores, where customers pick from a large variety of products.
            </p>
            <SaveButton pending={save.isPending} onClick={() => save.mutate({ layoutType })} />
          </DesignSection>

          <DesignSection
            title="Site Menu"
            hint="Visible on larger screens like desktops, laptops and tabs. Leave it empty to show your categories instead."
          >
            <MenuEditor items={siteMenu} onChange={setSiteMenu} />
            <SaveButton pending={save.isPending} onClick={saveMenu} />
          </DesignSection>
        </div>
      )}
    </div>
  );
}

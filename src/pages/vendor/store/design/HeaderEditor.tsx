import { useEffect, useState, type ReactNode } from 'react';
import { useDashboardView } from '../../../../lib/useDashboardView';
import { FullViewOnly } from '../../../../components/ui/FullViewOnly';
import { Phone, Search, ShoppingBag, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getVendorSettings } from '../../../../lib/vendorApi';
import type { DesignSettings, StoreMenuItem } from '../../../../lib/designSettingsApi';
import { toast } from '../../../../lib/toast';
import { MenuEditor } from './MenuEditor';
import { DesignLoading, DesignPageHeader, SaveButton, menuError, useDesignSettings } from './designShared';

type MenuKey = keyof Pick<DesignSettings, 'headerLeftMenu' | 'headerRightMenu' | 'siteMenu' | 'mobileMenu'>;
type Menus = Pick<DesignSettings, MenuKey>;

const MENU_INFO: Record<MenuKey, { title: string; hint: string }> = {
  headerLeftMenu: { title: 'Top links', hint: 'Small links shown above your logo on larger screens, like Track order or Contact.' },
  headerRightMenu: { title: 'Top links (right side)', hint: 'Small links shown above your logo, on the right.' },
  siteMenu: {
    title: 'Site Menu',
    hint: 'The main menu under the search bar on larger screens. Empty = your categories. Also editable in Layout Settings.',
  },
  mobileMenu: {
    title: 'Mobile Menu',
    hint: 'Shown from a menu button on phones. Empty = no menu button.',
  },
};

/**
 * Store > Design > Header Editor — a clickable preview of StorePal's
 * header. Clicking a menu area opens its editor below; Save stores all
 * four menus at once.
 */
export default function HeaderEditor() {
  const { settings, isLoading, save } = useDesignSettings();
  const [menus, setMenus] = useState<Menus | null>(null);
  // Simple mode (SIMPLE-VIEW-plan.md Step 8): top links, logo size and the cart total are Full mode, so it starts on the menu.
  const { isSimple } = useDashboardView();
  const [editing, setEditing] = useState<MenuKey>(isSimple ? 'siteMenu' : 'headerLeftMenu');
  // "Call Us Now" beside the search bar: off by default, shown only with a number.
  const [phoneOn, setPhoneOn] = useState(false);
  const [phoneLabel, setPhoneLabel] = useState('');
  const [phone, setPhone] = useState('');
  const [logoSize, setLogoSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>('MEDIUM');
  const [cartTotalOn, setCartTotalOn] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [showName, setShowName] = useState(true);
  const { data: vendor } = useQuery({ queryKey: ['vendor-settings'], queryFn: getVendorSettings });

  useEffect(() => {
    if (!settings) return;
    setMenus({
      headerLeftMenu: settings.headerLeftMenu,
      headerRightMenu: settings.headerRightMenu,
      siteMenu: settings.siteMenu,
      mobileMenu: settings.mobileMenu,
    });
    setPhoneOn(settings.headerPhoneEnabled ?? false);
    setPhoneLabel(settings.headerPhoneLabel ?? '');
    setPhone(settings.headerPhone ?? '');
    setLogoSize(settings.headerLogoSize ?? 'MEDIUM');
    setCartTotalOn(settings.headerShowCartTotal ?? false);
    setShowLogo(settings.headerShowLogo ?? true);
    setShowName(settings.headerShowStoreName ?? true);
  }, [settings]);

  const handleSave = () => {
    if (!menus) return;
    for (const key of Object.keys(MENU_INFO) as MenuKey[]) {
      const error = menuError(menus[key]);
      if (error) {
        setEditing(key);
        toast.error(`${MENU_INFO[key].title}: ${error}`);
        return;
      }
    }
    if (phoneOn && !phone.trim()) {
      toast.error('Add the phone number to show, or turn the phone off.');
      return;
    }
    save.mutate({ ...menus, headerPhoneEnabled: phoneOn, headerPhoneLabel: phoneLabel.trim(), headerPhone: phone.trim(), headerLogoSize: logoSize, headerShowCartTotal: cartTotalOn, headerShowLogo: showLogo, headerShowStoreName: showName });
  };

  return (
    <div>
      <DesignPageHeader
        title="Header Editor"
        description="Click a highlighted area of the preview to edit that menu of your StorePal header."
        actions={menus && <SaveButton pending={save.isPending} onClick={handleSave} />}
      />
      {isLoading || !menus ? (
        <DesignLoading />
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-regantify-text mb-2">Preview</p>
            <div className="bg-white rounded-2xl border border-black/5 px-6 py-4 space-y-3">
              {(!isSimple || menus.headerLeftMenu.length > 0 || menus.headerRightMenu.length > 0) && (
              <div className="flex items-center justify-between gap-4">
                <Zone active={editing === 'headerLeftMenu'} onClick={() => setEditing('headerLeftMenu')}>
                  <MenuPreview items={menus.headerLeftMenu} />
                </Zone>
                {/* One "Top links" list is enough for most stores; the right-hand list only shows if it already has links. */}
                {menus.headerRightMenu.length > 0 && (
                  <Zone active={editing === 'headerRightMenu'} onClick={() => setEditing('headerRightMenu')}>
                    <MenuPreview items={menus.headerRightMenu} />
                  </Zone>
                )}
              </div>
              )}
              <div className="flex items-center gap-4">
                <span className="font-extrabold text-xl text-regantify-text shrink-0">
                  {showLogo && <span className="mr-2 inline-block rounded bg-black/10 px-2 py-0.5 text-xs align-middle">Logo</span>}
                  {showName || !showLogo ? 'Your Store' : ''}
                </span>
                <div className="flex-1 max-w-md flex items-center rounded-lg border border-black/15 px-3 py-2 text-sm text-regantify-text-muted">
                  <span className="flex-1">Search</span>
                  <Search size={15} />
                </div>
                {phoneOn && phone.trim() && (
                  <span className="flex items-center gap-2 text-regantify-text">
                    <Phone size={18} />
                    <span className="leading-tight">
                      <span className="block text-[10px] text-regantify-text-muted">{phoneLabel.trim() || 'Call Us Now'}</span>
                      <span className="block text-xs font-semibold">{phone}</span>
                    </span>
                  </span>
                )}
                <div className="ml-auto flex items-center gap-3 text-regantify-text">
                  <User size={20} />
                  <ShoppingBag size={20} />
                </div>
              </div>
              <Zone active={editing === 'siteMenu'} onClick={() => setEditing('siteMenu')} wide>
                {menus.siteMenu.length > 0 ? (
                  <MenuPreview items={menus.siteMenu} />
                ) : (
                  <span className="text-xs text-regantify-text-muted">Your categories (click to set a custom Site Menu)</span>
                )}
              </Zone>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditing('mobileMenu')}
            className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
              editing === 'mobileMenu'
                ? 'border-regantify-cta bg-regantify-cta/10 text-regantify-text'
                : 'border-cyan-200 bg-cyan-50 text-regantify-text hover:border-regantify-cta'
            }`}
          >
            Click here to edit the <span className="text-regantify-cta font-medium">Mobile Menu</span>. This is the header
            menu shown on mobile phones.
            {menus.mobileMenu.length > 0 && (
              <span className="text-regantify-text-muted"> ({menus.mobileMenu.length} item(s))</span>
            )}
          </button>

          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-base font-medium text-regantify-text">{MENU_INFO[editing].title}</h2>
            <p className="text-xs text-regantify-text-muted mt-0.5 mb-4">{MENU_INFO[editing].hint}</p>
            <MenuEditor
              key={editing}
              items={menus[editing]}
              onChange={(items) => setMenus((m) => (m ? { ...m, [editing]: items } : m))}
            />
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-base font-medium text-regantify-text">Show a phone number beside the search bar</span>
              <input type="checkbox" checked={phoneOn} onChange={(e) => setPhoneOn(e.target.checked)} className="w-4 h-4" />
            </label>
            <p className="text-xs text-regantify-text-muted">Like “Call Us Now 01777…”. Off by default. Customers on a computer can click it to call.</p>
            {phoneOn && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-regantify-text-muted mb-1">Small text above the number</label>
                  <input type="text" maxLength={30} value={phoneLabel} onChange={(e) => setPhoneLabel(e.target.value)} placeholder="Call Us Now" className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-regantify-cta" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-regantify-text-muted mb-1">Phone number</label>
                  <input type="text" maxLength={60} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-regantify-cta" />
                  {!phone.trim() && vendor?.phone && (
                    <button type="button" onClick={() => setPhone(vendor.phone ?? '')} className="mt-1 text-xs font-medium text-regantify-cta hover:underline">
                      Use my number ({vendor.phone})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
            <div className="space-y-2">
              <h2 className="text-base font-medium text-regantify-text">Logo and store name</h2>
              <p className="text-xs text-regantify-text-muted">
                Shown together by default, in the header and the footer. Turn one off to show only the other. If there is no logo yet, the store name always shows.
              </p>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-regantify-text">Show my logo</span>
                <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="w-4 h-4" />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-regantify-text">Show my store name</span>
                <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="w-4 h-4" />
              </label>
            </div>
            <FullViewOnly>
            <div>
              <h2 className="text-base font-medium text-regantify-text">Logo size</h2>
              <p className="text-xs text-regantify-text-muted mt-0.5 mb-2">How big your logo (or store name) is in the header.</p>
              <div className="flex gap-2">
                {(['SMALL', 'MEDIUM', 'LARGE'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setLogoSize(size)}
                    className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      logoSize === size
                        ? 'border-regantify-cta bg-regantify-cta/10 text-regantify-cta'
                        : 'border-black/10 text-regantify-text-muted hover:border-black/20'
                    }`}
                  >
                    {size === 'SMALL' ? 'Small' : size === 'MEDIUM' ? 'Medium' : 'Large'}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-regantify-text">Show the cart total beside the bag icon</span>
              <input type="checkbox" checked={cartTotalOn} onChange={(e) => setCartTotalOn(e.target.checked)} className="w-4 h-4" />
            </label>
            </FullViewOnly>
          </div>
          <SaveButton pending={save.isPending} onClick={handleSave} />
        </div>
      )}
    </div>
  );
}

function Zone({ active, onClick, wide, children }: { active: boolean; onClick: () => void; wide?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${wide ? 'w-full' : 'min-w-[120px]'} text-left rounded-lg border border-dashed px-3 py-1.5 transition-colors ${
        active ? 'border-regantify-cta bg-regantify-cta/5' : 'border-transparent hover:border-black/20'
      }`}
    >
      {children}
    </button>
  );
}

function MenuPreview({ items }: { items: StoreMenuItem[] }) {
  if (items.length === 0) return <span className="text-xs text-regantify-cta">Add Menu</span>;
  return (
    <span className="flex items-center gap-4 flex-wrap text-[13px] text-regantify-text">
      {items.map((i) => (
        <span key={i.id}>{i.label || 'Untitled'}</span>
      ))}
    </span>
  );
}

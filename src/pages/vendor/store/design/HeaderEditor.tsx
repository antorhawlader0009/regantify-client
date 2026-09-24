import { useEffect, useState, type ReactNode } from 'react';
import { Search, ShoppingBag, User } from 'lucide-react';
import type { DesignSettings, StoreMenuItem } from '../../../../lib/designSettingsApi';
import { toast } from '../../../../lib/toast';
import { MenuEditor } from './MenuEditor';
import { DesignLoading, DesignPageHeader, SaveButton, menuError, useDesignSettings } from './designShared';

type MenuKey = keyof Pick<DesignSettings, 'headerLeftMenu' | 'headerRightMenu' | 'siteMenu' | 'mobileMenu'>;
type Menus = Pick<DesignSettings, MenuKey>;

const MENU_INFO: Record<MenuKey, { title: string; hint: string }> = {
  headerLeftMenu: { title: 'Top Left Menu', hint: 'Small links shown above your logo, on the left.' },
  headerRightMenu: { title: 'Top Right Menu', hint: 'Small links shown above your logo, on the right.' },
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
  const [editing, setEditing] = useState<MenuKey>('headerLeftMenu');

  useEffect(() => {
    if (!settings) return;
    setMenus({
      headerLeftMenu: settings.headerLeftMenu,
      headerRightMenu: settings.headerRightMenu,
      siteMenu: settings.siteMenu,
      mobileMenu: settings.mobileMenu,
    });
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
    save.mutate(menus);
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
              <div className="flex items-center justify-between gap-4">
                <Zone active={editing === 'headerLeftMenu'} onClick={() => setEditing('headerLeftMenu')}>
                  <MenuPreview items={menus.headerLeftMenu} />
                </Zone>
                <Zone active={editing === 'headerRightMenu'} onClick={() => setEditing('headerRightMenu')}>
                  <MenuPreview items={menus.headerRightMenu} />
                </Zone>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-extrabold text-xl text-regantify-text shrink-0">Your Logo</span>
                <div className="flex-1 max-w-md flex items-center rounded-lg border border-black/15 px-3 py-2 text-sm text-regantify-text-muted">
                  <span className="flex-1">Search</span>
                  <Search size={15} />
                </div>
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

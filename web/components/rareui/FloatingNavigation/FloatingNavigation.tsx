'use client';

import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import type { IconComponent } from 'reicon-react/createIcon';

/**
 * RareUI FloatingNavigation, adapted for Unraw's real route model.
 * The active/hover layers and layoutId motion come from the generated RareUI
 * component; links and active state are controlled by the app.
 */
export type FloatingNavigationItem = {
  label: string;
  href: string;
  icon: IconComponent;
};

type FloatingNavigationProps = {
  items: readonly FloatingNavigationItem[];
  isActive: (href: string) => boolean;
  more?: ReactNode;
};

export function FloatingNavigation({
  items,
  isActive,
  more,
}: FloatingNavigationProps) {

  return (
    <div className="app-shell-mobile-nav-floating">
      {items.map(({ label, href, icon: Icon }) => {
        const active = isActive(href);
        const primary = href === '/capture';

        return (
          <Link
            className={`app-shell-mobile-nav-item ${primary ? 'is-primary' : ''} ${
              active ? 'is-active' : ''
            }`}
            href={href}
            key={href}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
          >
            {active && (
              <motion.span
                aria-hidden="true"
                className="app-shell-mobile-nav-active-indicator"
                layoutId="rareui-nav-active"
              />
            )}
            <Icon
              size={primary ? 22 : 20}
              color="currentColor"
              weight="Outline"
              strokeWidth={1.7}
              aria-hidden={true}
            />
            <span className="app-shell-mobile-nav-label">{label}</span>
          </Link>
        );
      })}
      {more ? <div className="app-shell-mobile-more">{more}</div> : null}
    </div>
  );
}
export default FloatingNavigation;

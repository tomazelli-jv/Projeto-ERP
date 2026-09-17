// Sidebar e AppShell compartilham geometria e breakpoint; tablet não mantém mini rail.
export const layout = {
  sidebarExpandedWidth: 264,
  sidebarCollapsedWidth: 76,
  desktopBreakpoint: 'lg',
  headerHeight: 64
};

// Movimento reduzido preserva a geometria, sem animação de largura.
export const sidebarTransition = {
  transition: 'width 200ms ease, padding 200ms ease',
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
};

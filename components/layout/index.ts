/**
 * ImpactOS layout shell.
 *
 * The (app) route group layout already wraps every screen in <AppShell>, so a
 * page normally only needs <PageHeader> and <EmptyState>. <AppShell> is safe
 * to nest (a nested one renders its children only).
 */

export { AppShell } from "./app-shell";
export type { AppShellProps } from "./app-shell";

export { Header } from "./header";
export type { HeaderAiStatus, HeaderProps } from "./header";

export { Sidebar } from "./sidebar";
export type { SidebarProps } from "./sidebar";

export { PageHeader } from "./page-header";
export type { PageHeaderProps } from "./page-header";

export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";

export { ThemeToggle } from "./theme-toggle";

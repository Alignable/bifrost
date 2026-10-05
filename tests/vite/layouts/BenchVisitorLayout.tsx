import React, { useId } from "react";
import { layoutCms, type CmsLink } from "../../bench/fixtures/layoutCms";

// Stand-in for Alignable's CMS-driven visitor layout: same element count, depth and class-string weight.

const NAV_LINK_CLASS =
  "flex flex-row items-center gap-x-1.5 rounded-[10px] p-2.5 text-body-medium text-black-800 no-underline transition-all duration-500 hover:bg-purple-100 hover:text-purple-600 hover:[text-shadow:0_0_black]";
const NAV_BUTTON_CLASS =
  "group flex flex-row items-center gap-x-1.5 rounded-[10px] border-none bg-transparent p-2.5 text-body-medium text-black-800 no-underline transition-all duration-500 data-[state=open]:bg-purple-100 data-[state=open]:text-purple-600 data-[state=open]:text-body-bold";
const CTA_BASE_CLASS =
  "inline-flex items-center justify-center transition-[colors_opacity_shadow] duration-500 gap-2 text-body-bold no-underline border border-solid ring-offset-white box-border focus-visible:outline-none focus-visible:ring-2 data-[loading=false]:disabled:shadow-none data-[loading=false]:disabled:pointer-events-none data-[loading=true]:cursor-wait active:border-purple-600 focus-visible:ring-purple-200 [&_.loading-outer]:fill-purple-200 [&_.loading-inner]:fill-purple-500 [&_.loading-inner]:stroke-purple-500 [&:disabled_.loading-outer]:fill-purple-200 [&:disabled_.loading-inner]:fill-purple-500 [&:disabled_.loading-inner]:stroke-purple-500 data-[loading=false]:disabled:bg-grey-300 data-[loading=false]:disabled:border-grey-350 px-4 py-2 rounded-full w-max-content h-auto font-sans";
const CTA_SECONDARY_CLASS = `${CTA_BASE_CLASS} border-purple-400 text-purple-400 hover:text-purple-500 bg-white-100 hover:bg-grey-350 data-[loading=false]:disabled:text-black-800/50 shadow-none`;
const CTA_PRIMARY_CLASS = `${CTA_BASE_CLASS} shadow-sm bg-purple-400 border-purple-400 hover:bg-purple-600 text-white-100 hover:text-white-100 data-[loading=true]:text-white-100 data-[loading=false]:disabled:text-grey-550 disabled:border disabled:border-solid disabled:shadow-none [&_.loading-outer]:!fill-tp-light-200 [&_.loading-inner]:!fill-white-100 [&_.loading-inner]:!stroke-white-100`;

const { content, logoPaths, iconPaths } = layoutCms;

function Icon({ path, viewBox = "0 0 24 24", className }: { path: string; viewBox?: string; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} role="img" height="1em" fill="currentColor" className={className}>
      <path d={path} />
    </svg>
  );
}

function Logo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 212 47" role="img" height="1em" style={{ width: 136, height: 32, fill: "#5023B0" }} className="shrink-0">
      {logoPaths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

function Wysiwyg({ label }: { label: string }) {
  return (
    <div className="bg-transparent text-inherit" data-testid="wysiwyg">
      <div className="mx-auto box-content text-base/[130%] font-bold [&_*]:m-0 font-serif">
        <p>
          <span className="font-sans text-body-semibold">{label}</span>
        </p>
      </div>
    </div>
  );
}

function NavItem({ item }: { item: CmsLink }) {
  const id = useId();
  if (item.children.length === 0) {
    return (
      <li>
        <a className={NAV_LINK_CLASS} href={item.link.url} data-radix-collection-item="">
          <Wysiwyg label={item.label} />
        </a>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-y-1">
      <button id={`${id}-trigger`} data-state="closed" aria-expanded="false" aria-controls={`${id}-content`} className={NAV_BUTTON_CLASS} data-radix-collection-item="">
        <Wysiwyg label={item.label} />
        <div className="hidden">
          {item.children.map((child) => (
            <NavItem key={child._uid} item={child} />
          ))}
        </div>
        <Icon path={iconPaths[0]} viewBox="0 0 14 14" className="ml-auto h-3 w-3 duration-500 group-data-[state=open]:rotate-180" />
      </button>
    </li>
  );
}

function DesktopNav() {
  return (
    <nav aria-label="Main" data-orientation="horizontal" dir="ltr" className="sticky top-0 bg-white-100 shadow-large-deprecated normalize z-[101] hidden lg:block">
      <div style={{ position: "relative" }}>
        <ul data-orientation="horizontal" className="m-0 flex list-none items-center justify-center gap-x-2 bg-white-100 px-2 py-2.5 mx-auto max-w-[1320px] md:px-12" dir="ltr">
          <div className="mr-auto flex flex-row gap-2">
            <li>
              <a className={NAV_LINK_CLASS} href="/" data-radix-collection-item="">
                <Logo />
              </a>
            </li>
          </div>
          {content.nav.map((item) => (
            <NavItem key={item._uid} item={item} />
          ))}
          <div className="ml-auto flex flex-row gap-2">
            <a href="/biz_users/sign_in" target="_self" className={CTA_SECONDARY_CLASS} data-loading="false" data-testid="cta-button">
              Log in
            </a>
            <a href="/biz_users/sign_up?content_code=Website_Home" target="_self" className={CTA_PRIMARY_CLASS} data-loading="false" data-testid="cta-button">
              Join Now
            </a>
          </div>
        </ul>
      </div>
    </nav>
  );
}

function MobileNav() {
  return (
    <nav aria-label="Main" data-orientation="horizontal" dir="ltr" className="sticky top-0 bg-white-100 shadow-large-deprecated normalize z-[101] lg:hidden" data-testid="nav_menu_container">
      <div style={{ position: "relative" }}>
        <ul data-orientation="horizontal" className="m-0 flex list-none items-center justify-center gap-x-2 bg-white-100 py-2.5 mx-auto box-content max-w-[1320px] px-3 md:px-3 md:pl-12" dir="ltr">
          <li>
            <a className={NAV_LINK_CLASS} href="/" data-radix-collection-item="">
              <Logo />
            </a>
          </li>
          <li className="ml-auto">
            <button data-state="closed" aria-expanded="false" className={`${NAV_BUTTON_CLASS} text-grey-700`} data-radix-collection-item="">
              <Icon path={iconPaths[1]} className="h-8 w-8 group-data-[state=open]:hidden" />
              <Icon path={iconPaths[2]} className="h-8 w-8 group-data-[state=closed]:hidden" />
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function SocialLinks() {
  return (
    <>
      <a href="https://social.example.test/network" aria-label="social one">
        <Icon path={iconPaths[3]} viewBox="0.89 0 18 18" />
      </a>
      <a href="https://social.example.test/network-two" aria-label="social two">
        <Icon path={iconPaths[4]} viewBox="0.89 0 19.69 16" />
      </a>
    </>
  );
}

function Footer() {
  return (
    <footer className="normalize bg-grey-700 text-white-100">
      <div className="m-auto box-content px-4 py-6 md:max-w-[1200px] md:px-20">
        <div className="flex flex-col md:flex-row md:gap-x-8">
          <div className="hidden items-start lg:flex">
            <Icon path={iconPaths[5]} viewBox="0 0 23 24" className="h-[32px] text-white-100" />
            <Logo />
          </div>
          <nav className="order-2 box-content flex-1 md:order-1 md:px-4">
            <ul className="mx-0 my-4 box-content grid list-none grid-flow-dense grid-cols-2 gap-2.5 pl-0 md:my-0">
              {content.footerLinks.map((link) => (
                <li key={link._uid} className="block text-body-semibold text-white-100">
                  <div>
                    <a className="no-underline" href={link.link.url}>
                      {link.label}
                    </a>
                  </div>
                </li>
              ))}
              <li className="hidden justify-start self-end md:col-start-2 md:inline-block">
                <div className="flex items-center space-x-2">
                  <SocialLinks />
                </div>
              </li>
            </ul>
          </nav>
          <div className="order-3 flex-1 space-x-2 text-white-100 md:hidden">
            <SocialLinks />
          </div>
          <div className="order-1 block flex-1 md:order-2 md:w-28">
            <p className="my-0 mb-4 text-subheading-bold">Join Millions of Members</p>
            <form className="flex gap-x-3" method="GET">
              <input type="text" name="user[email]" className="box-content w-full flex-grow rounded-xl border border-solid px-4 py-3.5 leading-tight focus:outline-none sm:w-[300px] border-2 border-tp-dark-100 placeholder-grey-600 bg-white-100" placeholder="Enter your email" defaultValue="" />
              <a href="/biz_users/sign_up?content_code=Website" className={CTA_PRIMARY_CLASS} data-loading="false">
                Join
              </a>
            </form>
          </div>
        </div>
      </div>
      <div className="bg-grey-600 text-body-semibold text-white-100">
        <div className="m-auto box-content px-4 md:max-w-[1200px] md:px-20">
          <div className="box-content px-4 py-1 md:flex md:items-center md:justify-between md:py-0">
            <span className="hidden md:mt-2 md:block">© Copyright 2026</span>
            <nav>
              <ul className="box-content flex list-none flex-wrap gap-x-4 p-0 md:gap-x-4">
                {content.legalLinks.map((link) => (
                  <li key={link._uid} className="block py-1">
                    <div>
                      <a className="no-underline" href={link.link.url}>
                        {link.label}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function BenchVisitorLayout({ children, footer = true }: { children: React.ReactNode; footer?: boolean }) {
  return (
    <>
      <div id="page-loading-bar" role="progressbar" className="fixed left-0 top-0 z-[999999] h-0.5 border-0 border-b border-solid border-grey-450 bg-white-100 transition-size-x duration-200" style={{ width: "0%" }} />
      <div className="normalize">
        <div className="flex flex-col" style={{ minHeight: "100vh" }}>
          <DesktopNav />
          <MobileNav />
          <div className="grow">{children}</div>
          {footer && <Footer />}
        </div>
      </div>
    </>
  );
}

"use client";

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { useRouter } from "./navigation";

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  replace?: boolean;
}

/** Stand-in for `next/link` in the single-file artifact build. */
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, replace, onClick, children, ...rest },
  ref,
) {
  const router = useRouter();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (replace) router.replace(href);
    else router.push(href);
  };
  return (
    <a ref={ref} href={`#${href}`} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
});

export default Link;

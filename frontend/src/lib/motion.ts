import type { HTMLMotionProps } from "framer-motion";

type MotionDivProps = HTMLMotionProps<"div">;

export const PAGE_ENTER: Pick<MotionDivProps, "initial" | "animate"> = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export const cardEnter = (i = 0): Pick<MotionDivProps, "initial" | "animate"> => ({
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3 } as any,
  } as any,
});

export const DRAWER_INITIAL = { x: "100%" };
export const DRAWER_ANIMATE = { x: 0, transition: { type: "spring" as const, damping: 28, stiffness: 280 } };
export const DRAWER_EXIT = { x: "100%", transition: { type: "spring" as const, damping: 28, stiffness: 280 } };

export const BACKDROP_INITIAL = { opacity: 0 };
export const BACKDROP_ANIMATE = { opacity: 1 };
export const BACKDROP_EXIT = { opacity: 0 };

export const FADE_SCALE: Pick<MotionDivProps, "initial" | "animate" | "exit"> = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
};

export const COLLAPSE_INITIAL = { height: 0, opacity: 0 };
export const COLLAPSE_ANIMATE = { height: "auto", opacity: 1 };
export const COLLAPSE_EXIT = { height: 0, opacity: 0 };

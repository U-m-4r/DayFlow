/** Reusable accessible motion primitives make animation consistent without blocking reduced-motion users. */
import { AnimatePresence,MotionConfig,motion,useReducedMotion as useFMReducedMotion } from 'framer-motion';
export const MotionProvider=({children}:{children:React.ReactNode})=>{const reduce=useFMReducedMotion();return <MotionConfig reducedMotion={reduce?'always':'user'}>{children}</MotionConfig>};
export const AnimatedPage=({children}:{children:React.ReactNode})=><motion.main initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.22}}>{children}</motion.main>;
export const Stagger=({children}:{children:React.ReactNode})=><motion.div initial="hidden" animate="show" variants={{hidden:{},show:{transition:{staggerChildren:.035}}}}>{children}</motion.div>;
export const StaggerItem=({children,className}:{children:React.ReactNode;className?:string})=><motion.div className={className} variants={{hidden:{opacity:0,y:12},show:{opacity:1,y:0}}} transition={{type:'spring',stiffness:380,damping:28}}>{children}</motion.div>;
export const Presence=AnimatePresence; export {motion};

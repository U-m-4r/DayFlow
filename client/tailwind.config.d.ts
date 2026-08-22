/** Design tokens give every screen the same premium visual language and 4px rhythm. */
declare const _default: {
    content: string[];
    theme: {
        extend: {
            colors: {
                primary: string;
                'primary-light': string;
                ink: string;
                background: string;
                surface: string;
                success: string;
                warning: string;
                danger: string;
                muted: string;
            };
            fontFamily: {
                display: [string, string];
                sans: [string, string];
            };
            boxShadow: {
                surface1: string;
                surface2: string;
            };
            backgroundImage: {
                'gradient-primary': string;
                'gradient-surface': string;
            };
        };
    };
    plugins: any[];
};
export default _default;

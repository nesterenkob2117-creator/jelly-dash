export const UNIT = 48; // 1 grid unit = 48 logical pixels
export const WORLD_HEIGHT = 560;
export const GROUND_Y = 468; // Pixel Y of gy = 0
export const CEILING_GY = 8.75; // Grid height of ceiling surface
export const CEILING_Y = GROUND_Y - CEILING_GY * UNIT; // 48px

export const PLAYER_SIZE = 1.0; // 1x1 grid unit
export const PLAYER_SCREEN_X = 240; // Fixed horizontal screen anchor for player

export const GRAVITY = 56; // grid units / s^2
export const JUMP_VEL = 16.5; // grid units / s
export const PAD_YELLOW_VEL = 23.5;
export const PAD_PINK_VEL = 18.8;
export const ORB_YELLOW_VEL = 16.2;
export const ORB_CYAN_IMPULSE = 6.2;

export const STORAGE_KEY = 'jelly_dash_save_v1';

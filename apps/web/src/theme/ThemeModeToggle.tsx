import CheckIcon from '@mui/icons-material/Check';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { type ReactElement, useState } from 'react';

type Mode = 'light' | 'dark' | 'system';

const OPTIONS: Array<{ mode: Mode; label: string; icon: ReactElement }> = [
  { mode: 'light', label: 'Light', icon: <LightModeOutlinedIcon fontSize="small" /> },
  { mode: 'dark', label: 'Dark', icon: <DarkModeOutlinedIcon fontSize="small" /> },
  { mode: 'system', label: 'System', icon: <SettingsBrightnessOutlinedIcon fontSize="small" /> },
];

/**
 * Theme picker. MUI persists the choice in localStorage, so it survives
 * closing and re-opening the application.
 */
export function ThemeModeToggle() {
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!mode) return null; // Not resolved yet (first render).
  const current = OPTIONS.find((option) => option.mode === mode) ?? OPTIONS[2]!;

  return (
    <>
      <Tooltip title={`Theme: ${current.label}`}>
        <IconButton
          color="inherit"
          aria-label="Change theme"
          aria-haspopup="menu"
          aria-controls={anchor ? 'theme-menu' : undefined}
          aria-expanded={anchor ? 'true' : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          {current.icon}
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-menu"
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {OPTIONS.map((option) => (
          <MenuItem
            key={option.mode}
            selected={option.mode === mode}
            onClick={() => {
              setMode(option.mode);
              setAnchor(null);
            }}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
            {option.mode === mode && <CheckIcon fontSize="small" sx={{ ml: 2 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

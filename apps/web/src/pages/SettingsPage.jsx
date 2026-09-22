import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useOutletContext } from 'react-router';
import { useThemeMode } from '../app/theme-mode.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';

// Preferências visuais usam os estados oficiais, sem cópia local ou gravação adicional.
export function SettingsPage() {
  const { themeMode, setThemeMode } = useThemeMode();
  const { collapsed, setCollapsed } = useOutletContext();
  return (
    <>
      <PageHeader
        title="Parametrização"
        description="Personalize o comportamento e a aparência do sistema."
      />
      <Stack spacing={2} sx={{ maxWidth: 880 }}>
        <SectionCard title="Aparência" subtitle="Tema" icon={LightModeOutlinedIcon}>
          <ToggleButtonGroup
            exclusive
            value={themeMode}
            aria-label="Tema"
            onChange={(_, value) => value && setThemeMode(value)}
            sx={{ flexWrap: 'wrap' }}
          >
            {[
              ['light', 'Claro', LightModeOutlinedIcon],
              ['dark', 'Escuro', DarkModeOutlinedIcon],
              ['system', 'Sistema', ComputerOutlinedIcon]
            ].map(([value, label, Icon]) => (
              <ToggleButton key={value} value={value} sx={{ gap: 1, px: { xs: 1.5, sm: 3 } }}>
                <Icon fontSize="small" />
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {themeMode === 'system'
              ? 'O tema acompanha a configuração do sistema operacional.'
              : 'Esta preferência também pode ser alterada no cabeçalho.'}
          </Typography>
        </SectionCard>
        <SectionCard title="Navegação" subtitle="Menu lateral" icon={ViewSidebarOutlinedIcon}>
          <ToggleButtonGroup
            exclusive
            value={collapsed ? 'collapsed' : 'expanded'}
            aria-label="Menu lateral"
            onChange={(_, value) => value && setCollapsed(value === 'collapsed')}
          >
            <ToggleButton value="expanded">Expandida</ToggleButton>
            <ToggleButton value="collapsed">Recolhida</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Preferência para desktop. Em telas menores, o menu continua abrindo pelo botão de navegação.
          </Typography>
        </SectionCard>
      </Stack>
    </>
  );
}

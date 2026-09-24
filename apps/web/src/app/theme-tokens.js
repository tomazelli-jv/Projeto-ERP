// Paletas compartilham nomes semânticos; componentes e overrides não precisam duplicar estilos por modo.
export const darkPalette = {
  mode: 'dark',
  background: { default: '#141414', paper: '#1B1B1A' },
  surface: { secondary: '#222220', hover: '#292825' },
  divider: '#33312D',
  text: { primary: '#ECE8E1', secondary: '#A8A198', disabled: '#706D66' },
  primary: {
    main: '#B99A52',
    dark: '#B99A52',
    light: 'rgba(185,154,82,0.10)',
    contrastText: '#141414',
    hover: '#C6A85F',
    soft: 'rgba(185,154,82,0.10)',
    border: 'rgba(185,154,82,0.24)'
  },
  secondary: { main: '#A8A198' },
  success: { main: '#91B19A' },
  warning: { main: '#BEA078' },
  error: { main: '#C58D87' },
  info: { main: '#94ABB6' },
  action: {
    hover: '#292825',
    selected: 'rgba(185,154,82,0.10)',
    disabled: '#706D66',
    disabledBackground: '#292825'
  }
};

// Dourado sólido identifica ações. A variante escura garante leitura de texto e foco em superfícies claras.
export const lightPalette = {
  mode: 'light',
  background: { default: '#F5F3EE', subtle: '#EEEAE2', paper: '#FBFAF7' },
  surface: { secondary: '#EEEAE2', hover: '#E9E4DA' },
  divider: '#D8D2C8',
  border: { soft: 'rgba(88,74,45,0.12)' },
  text: { primary: '#2A2824', secondary: '#655F57', disabled: '#A49B8D' },
  primary: {
    main: '#B5964D',
    dark: '#715620',
    light: '#EAE0C7',
    contrastText: '#171510',
    hover: '#A9873F',
    soft: '#EAE0C7',
    border: 'rgba(181,150,77,0.24)'
  },
  secondary: { main: '#655F57' },
  success: { main: '#4E7057' },
  warning: { main: '#715620' },
  error: { main: '#95534E' },
  info: { main: '#506C7B' },
  action: {
    hover: '#E9E4DA',
    selected: '#EAE0C7',
    disabled: '#A49B8D',
    disabledBackground: '#EEEAE2'
  }
};

// Fundo semântico discreto compartilhado por indicadores, alertas e chips.
for (const palette of [lightPalette, darkPalette]) {
  for (const key of ['success', 'error', 'info', 'warning']) {
    palette[key].soft = palette[key].main + '14';
  }
}

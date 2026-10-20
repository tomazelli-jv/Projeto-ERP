// Paletas compartilham nomes semânticos; componentes e overrides não precisam duplicar estilos por modo.
export const darkPalette = {
  mode: 'dark',
  background: { default: '#0B1210', paper: '#111C18' },
  surface: { secondary: '#182820', hover: '#20362B' },
  divider: '#2C4237',
  text: { primary: '#EDF3EF', secondary: '#A5B4AC', disabled: '#73877B' },
  primary: {
    main: '#96CEA4',
    dark: '#96CEA4',
    light: 'rgba(150,206,164,0.10)',
    contrastText: '#0B1210',
    hover: '#ACDDB7',
    soft: 'rgba(150,206,164,0.10)',
    border: 'rgba(150,206,164,0.24)'
  },
  secondary: { main: '#A5B4AC' },
  success: { main: '#82C99C' },
  warning: { main: '#D0B575' },
  error: { main: '#DE9690' },
  info: { main: '#90BFC4' },
  action: {
    hover: '#20362B',
    selected: 'rgba(150,206,164,0.10)',
    disabled: '#73877B',
    disabledBackground: '#20362B'
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

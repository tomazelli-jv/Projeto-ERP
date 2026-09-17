// Paletas compartilham nomes semânticos; componentes e overrides não precisam duplicar estilos por modo.
export const darkPalette = {
  mode: 'dark',
  background: { default: '#0B0B0C', paper: '#111113' },
  surface: { secondary: '#151518', hover: '#1A1A1E' },
  divider: '#29292E',
  text: { primary: '#F2F1ED', secondary: '#A39F96', disabled: '#706D66' },
  primary: {
    main: '#D3AD49',
    dark: '#D3AD49',
    light: 'rgba(211,173,73,0.12)',
    contrastText: '#0B0B0C',
    hover: '#E0BD5B',
    soft: 'rgba(211,173,73,0.12)',
    border: 'rgba(211,173,73,0.30)'
  },
  secondary: { main: '#A39F96' },
  success: { main: '#80B594' },
  warning: { main: '#D3AD49' },
  error: { main: '#D68B83' },
  info: { main: '#8DAABA' },
  action: {
    hover: '#1A1A1E',
    selected: 'rgba(211,173,73,0.12)',
    disabled: '#706D66',
    disabledBackground: '#1A1A1E'
  }
};

// Dourado sólido identifica ações. A variante escura garante leitura de texto e foco em superfícies claras.
export const lightPalette = {
  mode: 'light',
  background: { default: '#F4F1EA', subtle: '#EEE9DF', paper: '#FCFBF8' },
  surface: { secondary: '#F7F4EE', hover: '#F1EBDD' },
  divider: '#D9D1C3',
  border: { soft: 'rgba(88,74,45,0.12)' },
  text: { primary: '#1F1B16', secondary: '#6E665C', disabled: '#A49B8D' },
  primary: {
    main: '#C9A646',
    dark: '#795B16',
    light: 'rgba(201,166,70,0.14)',
    contrastText: '#1F1B16',
    hover: '#B89335',
    soft: 'rgba(201,166,70,0.14)',
    border: 'rgba(201,166,70,0.32)'
  },
  secondary: { main: '#6E665C' },
  success: { main: '#3D7150' },
  warning: { main: '#795B16' },
  error: { main: '#A0443C' },
  info: { main: '#416B7A' },
  action: {
    hover: '#F1EBDD',
    selected: 'rgba(201,166,70,0.14)',
    disabled: '#A49B8D',
    disabledBackground: '#EEE9DF'
  }
};

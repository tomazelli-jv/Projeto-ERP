// Tokens do padrão de cadastro/perfil: cards com faixa dourada e labels externos nos dois temas.
export const businessCardSx = {
  minWidth: 0,
  borderRadius: 2,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main}, transparent)`
  },
  '& .MuiCardContent-root > .MuiStack-root:first-of-type .MuiSvgIcon-root': {
    boxSizing: 'content-box',
    p: 0.75,
    borderRadius: 1.5,
    bgcolor: 'primary.soft'
  }
};
export const businessFormSx = {
  '& .MuiTextField-root .MuiInputLabel-root': {
    position: 'static',
    transform: 'none',
    mb: 0.75,
    maxWidth: '100%',
    fontSize: 13,
    color: 'text.secondary'
  },
  '& .MuiInputLabel-asterisk': { color: 'primary.dark' },
  '& .MuiOutlinedInput-root': { minHeight: 40, bgcolor: 'background.default' },
  '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
  '& .MuiOutlinedInput-notchedOutline': { top: 0 },
  '& .MuiFormHelperText-root': { mx: 0 }
};

// Densidade compacta limitada a Empresas e Lojas, incluindo os dialogs renderizados em portal.
export const businessDensitySx = {
  '& .MuiTypography-h1': { fontSize: { xs: 22, md: 24 } },
  '& .MuiTypography-h2, & .MuiDialogTitle-root': { fontSize: 18 },
  '& .MuiTypography-h3': { fontSize: 15 },
  '& .MuiTypography-body1, & .MuiTypography-body2': { fontSize: 13 },
  '& .MuiTypography-caption, & .MuiChip-label': { fontSize: 11 },
  '& .MuiButton-root': { fontSize: 12, minHeight: 36, px: 1.5 },
  '& .MuiChip-root': { height: 22 },
  '& .MuiCardContent-root, & .MuiCardContent-root:last-child': { p: 2 },
  '& .MuiCardContent-root > .MuiStack-root:first-of-type': { mb: 1.5 },
  '& .MuiInputBase-root': { fontSize: 13 },
  '& .MuiInputBase-input': { py: 1.25 }
};

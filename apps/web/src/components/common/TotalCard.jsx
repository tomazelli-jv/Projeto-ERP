import { Card } from '@mui/material';
import PropTypes from 'prop-types';

// Padrão único para cards de totais atuais e futuros. A cor do brilho acompanha o tema,
// sem aplicar efeito a formulários, tabelas ou outros cards de conteúdo.
export function TotalCard({ sx, ...props }) {
  return (
    <Card
      {...props}
      sx={[
        ...(Array.isArray(sx) ? sx : [sx]),
        (theme) => {
          const dark = theme.palette.mode === 'dark';
          const border = dark ? '#F4EBD7' : '#B5964A';
          const glow = dark ? 'rgba(244,235,215,.38)' : 'rgba(181,150,74,.38)';
          return {
            transition: 'border-color .25s, box-shadow .25s',
            '&:hover': { borderColor: border, boxShadow: `0 0 0 1px ${border}, 0 0 20px ${glow}` },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
          };
        }
      ]}
    />
  );
}

TotalCard.propTypes = {
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.func, PropTypes.array])
};

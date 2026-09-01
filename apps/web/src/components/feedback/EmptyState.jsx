import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { Box, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export function EmptyState({ icon: Icon = InboxOutlinedIcon, title, description, action }) {
  return (
    <Box sx={{ py: { xs: 5, md: 7 }, px: 2, textAlign: 'center' }}>
      <Box
        sx={{
          mx: 'auto',
          mb: 2,
          display: 'grid',
          placeItems: 'center',
          width: 52,
          height: 52,
          borderRadius: 3,
          color: 'primary.main',
          backgroundColor: 'primary.light'
        }}
      >
        <Icon />
      </Box>
      <Typography fontWeight={700}>{title}</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mx: 'auto', mt: 0.75, maxWidth: 480 }}>
        {description}
      </Typography>
      {action && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          {action}
        </Stack>
      )}
    </Box>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  action: PropTypes.node
};

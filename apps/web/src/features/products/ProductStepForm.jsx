import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Stack,
  Step,
  StepButton,
  Stepper,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { useAuth } from '../../app/auth/auth-context.js';
import { useOperationalContext } from '../../app/operational-context/operational-context.js';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { StickyFormActions } from '../../components/common/StickyFormActions.jsx';
import { CancelButton } from '../../components/common/CancelButton';
import { CreateButton } from '../../components/common/CreateButton.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { MoneyField } from '../../components/business/MoneyField.jsx';
import { validMoney } from '../../components/business/money.js';
import { useEntityMutation } from '../parties/entity-queries.js';
import { useLookupSource } from '../catalog-lookups/lookup-queries.js';
import { GroupField } from '../product-groups/GroupField.jsx';
import { groupModule } from '../product-groups/group-module.js';
import { BrandField } from '../brands/BrandField.jsx';
import { useBrandsSource } from '../brands/brands-queries.js';
import { UnitField } from '../units/UnitField.jsx';
import { unitModule } from '../units/unit-module.js';
import { resolveProductUnit } from '../units/mockUnitsRepository.js';
import { NcmField } from '../ncm/NcmField.jsx';
import { ncmModule } from '../ncm/ncm-module.js';
import { resolveProductNcm } from '../ncm/mockNcmRepository.js';
import { emptyProduct, validateProduct, validateProductExtension } from './product-model.js';
import { fiscalSections, fiscalFields, productSteps } from './product-fields.js';
import { ProductSummary } from './ProductShared.jsx';

const card = { borderRadius: '14px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' };
const grid = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))' }
};
// Um único rascunho para criação/edição; trocar etapas nunca persiste nem apaga valores.
export function ProductStepForm({ initial }) {
  const { claims } = useAuth();
  const { stores } = useOperationalContext();
  const [baseline] = useState(() => ({
    ...emptyProduct(),
    ...initial,
    stockStoreId: String(initial?.stockStoreId || claims?.lojaId || '')
  }));
  const [form, setForm] = useState(baseline);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const mutation = useEntityMutation();
  const navigate = useNavigate();
  const root = useRef(null);
  const lock = useRef(false);
  const { repository: unitsRepository } = useLookupSource(unitModule);
  const { repository: groupsRepository } = useLookupSource(groupModule);
  const { repository: ncmRepository } = useLookupSource(ncmModule);
  const { repository: brandsRepository } = useBrandsSource();
  const product = form.type === 'PRODUCT';
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const feedback = (key) => ({ error: Boolean(errors[key]), helperText: errors[key] });
  const field = (key, label, required = false, type = 'text') => (
    <TextField
      fullWidth
      label={label}
      required={required}
      value={form[key] ?? ''}
      type={type}
      onChange={(e) => change(key, e.target.value)}
      {...feedback(key)}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: {
          maxLength: ['description', 'serviceDescription'].includes(key)
            ? 4000
            : key === 'reformNotes'
              ? 2000
              : key === 'gtin'
                ? 14
                : key === 'code'
                  ? 60
                  : 200,
          inputMode:
            fiscalFields.some(([name, , kind]) => name === key && kind === '%') ||
            ['initialStock', 'minimumStock', 'maximumStock', 'margin'].includes(key)
              ? 'decimal'
              : ['gtin', 'durationMinutes', 'cest', 'cfop'].includes(key)
                ? 'numeric'
                : undefined
        }
      }}
      multiline={key === 'description' || key === 'serviceDescription' || key === 'reformNotes'}
      minRows={key === 'description' || key === 'serviceDescription' || key === 'reformNotes' ? 3 : undefined}
    />
  );
  const money = (key, label, required = false) => (
    <MoneyField
      label={label}
      required={required}
      value={form[key]}
      onChange={(value) => change(key, value)}
      {...feedback(key)}
    />
  );
  function stageErrors(stage) {
    const found = {};
    const extended = validateProductExtension(form) ?? {};
    if (stage === 0) {
      if (!form.name.trim()) found.name = 'Informe o nome do item.';
      if (!form.code.trim()) found.code = 'Informe o código interno.';
      if (!form.category.trim()) found.category = 'Selecione um grupo.';
      if (!form.unit.trim()) found.unit = 'Selecione uma unidade.';
      if (product && form.gtin && !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(form.gtin))
        found.gtin = 'GTIN deve conter 8, 12, 13 ou 14 dígitos.';
      if (!product && form.durationMinutes && !/^\d+$/.test(form.durationMinutes))
        found.durationMinutes = 'Informe minutos inteiros não negativos.';
    }
    if (stage === 1) {
      for (const [key] of fiscalFields) if (extended[key]) found[key] = extended[key];
      if (product && form.ncm && !/^\d{8}$/.test(form.ncm)) found.ncm = 'NCM deve conter 8 dígitos.';
    }
    if (stage === 2)
      for (const key of ['initialStock', 'minimumStock', 'maximumStock'])
        if (extended[key]) found[key] = extended[key];
    if (stage === 3) {
      for (const key of ['margin', 'promotionPriceCents', 'promotionStart', 'promotionEnd'])
        if (extended[key]) found[key] = extended[key];
      if (!validMoney(form.priceCents)) found.priceCents = 'Informe um preço de venda válido e não negativo.';
      if (product && form.costCents != null && !validMoney(form.costCents))
        found.costCents = 'Informe um custo válido.';
    }
    return found;
  }
  function showStage(next) {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => {
      root.current?.scrollIntoView({ block: 'start' });
      root.current?.querySelector('[data-step-heading]')?.focus();
    });
  }
  function report(stage, found) {
    setStep(stage);
    setErrors(found);
    requestAnimationFrame(() => root.current?.querySelector('[aria-invalid="true"]')?.focus());
  }
  function next(target = step + 1) {
    for (let stage = 0; stage < target; stage++) {
      const found = stageErrors(stage);
      if (Object.keys(found).length) return report(stage, found);
    }
    showStage(target);
  }
  function cancel() {
    if (dirty) setConfirm('cancel');
    else navigate('/products');
  }
  function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (step < 3) return next();
    for (let stage = 0; stage < 4; stage++) {
      const found = stageErrors(stage);
      if (Object.keys(found).length) return report(stage, found);
    }
    const message = validateProduct(form);
    if (message) return setError(message);
    if (initial && initial.status !== form.status) return setConfirm('status');
    save();
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      let data = await resolveProductUnit(unitsRepository, form, initial);
      data = await resolveProductNcm(ncmRepository, data, initial);
      if (product && form.brandId) {
        const brand = await brandsRepository.getById(form.brandId);
        if ((!brand || !brand.active) && form.brandId !== initial?.brandId)
          throw Error('Selecione uma marca ativa para o novo vínculo.');
        if (brand) data = { ...data, brand: brand.name };
      }
      if (form.groupId) {
        const group = await groupsRepository.getById(form.groupId);
        if ((!group || !group.active) && form.groupId !== initial?.groupId)
          throw Error('Selecione um grupo ativo para o novo vínculo.');
        if (group) data = { ...data, category: group.name };
      }
      await mutation.mutateAsync({ operation: initial ? 'update' : 'create', id: initial?.id, data });
      navigate('/products', {
        state: { productFeedback: initial ? 'Item atualizado com sucesso.' : 'Item cadastrado com sucesso.' }
      });
    } catch (cause) {
      setError(cause.message);
      setConfirm('');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const Submit = initial ? Button : CreateButton;
  return (
    <Box
      component="form"
      noValidate
      onSubmit={submit}
      ref={root}
      sx={{
        maxWidth: 1120,
        mx: 'auto',
        scrollMarginTop: 100,
        '& h1': { fontSize: 26, fontWeight: 650 },
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          '&.Mui-focused': { boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.soft}` }
        }
      }}
    >
      <PageHeader
        title={initial ? 'Editar produto' : 'Novo produto'}
        breadcrumbs={['Produtos', initial ? 'Editar produto' : 'Novo produto']}
        description="Preencha as informações do item em etapas."
        action={
          <Button variant="outlined" disabled={busy} onClick={cancel}>
            ← Voltar para a lista
          </Button>
        }
      />
      <Stepper
        component="ol"
        activeStep={step}
        alternativeLabel
        sx={{
          p: 0,
          mb: 3,
          listStyle: 'none',
          '& .MuiStepIcon-root': { fontSize: 28 },
          '& .MuiStepConnector-line': { borderTopWidth: 2 },
          '& .Mui-completed .MuiStepConnector-line, & .Mui-active .MuiStepConnector-line': {
            borderColor: 'primary.main'
          },
          '& .MuiStepLabel-label': { fontSize: { xs: 11, sm: 14 } }
        }}
      >
        {productSteps.map((label, index) => (
          <Step component="li" key={label} completed={index < step}>
            <StepButton
              disabled={busy}
              aria-current={index === step ? 'step' : undefined}
              onClick={() => (index < step ? showStage(index) : next(index))}
            >
              {label}
            </StepButton>
          </Step>
        ))}
      </Stepper>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box
        component="fieldset"
        disabled={busy}
        sx={{
          m: 0,
          p: 0,
          border: 0,
          minWidth: 0,
          display: 'grid',
          alignItems: 'start',
          gap: 2.5,
          gridTemplateColumns: 'minmax(0,1fr)',
          '@media(min-width:900px)': { gridTemplateColumns: 'minmax(0,1fr) 340px' }
        }}
      >
        <Stack
          key={step}
          spacing={2.5}
          sx={{
            minWidth: 0,
            animation: 'productStep 180ms ease-out',
            '@keyframes productStep': {
              from: { opacity: 0, transform: 'translateY(4px)' },
              to: { opacity: 1, transform: 'none' }
            },
            '@media(prefers-reduced-motion:reduce)': { animation: 'none' }
          }}
        >
          <Typography
            component="h2"
            tabIndex={-1}
            data-step-heading
            sx={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              clipPath: 'inset(50%)'
            }}
          >
            {productSteps[step]}
          </Typography>
          {step === 0 && (
            <>
              <SectionCard title="Dados gerais" sx={card}>
                <Stack spacing={2}>
                  <ToggleButtonGroup
                    exclusive
                    value={form.type}
                    aria-label="Tipo do item"
                    onChange={(_, value) => {
                      if (value === 'SERVICE' && initial?.initialStock) {
                        setError(
                          'Este produto possui saldo inicial registrado e não pode ser convertido em serviço.'
                        );
                      } else if (value && value !== form.type) setConfirm(value);
                    }}
                  >
                    <ToggleButton value="PRODUCT">Produto</ToggleButton>
                    <ToggleButton value="SERVICE">Serviço</ToggleButton>
                  </ToggleButtonGroup>
                  <Box sx={grid}>
                    {field('name', 'Nome', true)}
                    {field('code', 'Código interno', true)}
                    {product && field('gtin', 'Código de barras / GTIN')}
                    <FormControlLabel
                      label="Item ativo"
                      control={
                        <Switch
                          checked={form.status === 'ACTIVE'}
                          onChange={(e) => change('status', e.target.checked ? 'ACTIVE' : 'INACTIVE')}
                        />
                      }
                    />
                  </Box>
                  {field('description', 'Descrição')}
                  {!product && (
                    <>
                      {field('durationMinutes', 'Duração estimada (minutos)')}
                      {field('serviceDescription', 'Descrição do serviço')}
                    </>
                  )}
                </Stack>
              </SectionCard>
              <SectionCard title="Classificação" sx={card}>
                <Stack spacing={2}>
                  <GroupField
                    required
                    value={form.category}
                    groupId={form.groupId}
                    initialId={initial?.groupId}
                    onChange={(value) => setForm((old) => ({ ...old, ...value }))}
                    {...feedback('category')}
                  />
                  {product && (
                    <BrandField
                      value={form.brand}
                      brandId={form.brandId}
                      initialName={initial?.brand}
                      initialId={initial?.brandId}
                      onChange={(value) => setForm((old) => ({ ...old, ...value }))}
                    />
                  )}
                  <UnitField
                    required
                    value={form.unit}
                    unitId={form.unitId}
                    initialUnit={initial?.unit}
                    initialId={initial?.unitId}
                    onChange={(value) => setForm((old) => ({ ...old, ...value }))}
                    {...feedback('unit')}
                  />
                </Stack>
              </SectionCard>
            </>
          )}
          {step === 1 && (
            <>
              <Typography variant="body2" color="text.secondary">
                Configuração local, sem cálculo ou aplicação automática de tributos.
              </Typography>
              {fiscalSections.map(([title, fields], index) => (
                <SectionCard title={title} key={title} sx={card}>
                  <Box sx={grid}>
                    {index === 0 && product && (
                      <>
                        <NcmField
                          value={form.ncm}
                          ncmId={form.ncmId}
                          initialNcm={initial?.ncm}
                          initialId={initial?.ncmId}
                          onChange={(value) => setForm((old) => ({ ...old, ...value }))}
                          {...feedback('ncm')}
                        />
                        {field('manufacturerReference', 'Referência do fabricante')}
                      </>
                    )}
                    {fields.map(([key, label, kind]) => (
                      <Box key={key} sx={key === 'reformNotes' ? { gridColumn: '1 / -1' } : undefined}>
                        {field(key, kind === '%' ? `${label} (%)` : label)}
                      </Box>
                    ))}
                  </Box>
                </SectionCard>
              ))}
            </>
          )}
          {step === 2 && (
            <SectionCard title="Configuração de estoque" sx={card}>
              <Stack spacing={2}>
                <FormControlLabel
                  label="Controla estoque"
                  control={
                    <Switch
                      disabled={!product}
                      checked={product && form.trackStock}
                      onChange={(e) => change('trackStock', e.target.checked)}
                    />
                  }
                />
                {!product && (
                  <Typography variant="body2" color="text.secondary">
                    Serviços não controlam estoque físico.
                  </Typography>
                )}
                {product && !form.trackStock && Object.keys(errors).length > 0 && (
                  <Alert severity="error">
                    Ative o controle para corrigir as quantidades preenchidas antes de continuar.
                  </Alert>
                )}
                {product && form.trackStock && (
                  <>
                    <TextField
                      label="Loja"
                      value={
                        stores.find((store) => store.id === form.stockStoreId)?.nome ||
                        (form.stockStoreId ? `Loja ${form.stockStoreId}` : 'Nenhuma loja selecionada')
                      }
                      slotProps={{ input: { readOnly: true } }}
                      helperText="Contexto oficial da loja. O saldo inicial fica vinculado a ela."
                    />
                    <Box sx={grid}>
                      {initial ? (
                        <TextField
                          label="Saldo atual"
                          value="Aguardando integração de movimentações"
                          slotProps={{ input: { readOnly: true } }}
                          helperText={`Saldo inicial registrado: ${initial.initialStock || '—'}. Ajustes futuros exigem movimentação.`}
                        />
                      ) : (
                        field('initialStock', 'Saldo inicial')
                      )}
                      {field('minimumStock', 'Estoque mínimo')}
                      {field('maximumStock', 'Estoque máximo')}
                      {field('stockLocation', 'Localização')}
                    </Box>
                    <FormControlLabel
                      label="Permitir estoque negativo?"
                      control={
                        <Switch
                          checked={form.allowNegativeStock}
                          onChange={(e) => change('allowNegativeStock', e.target.checked)}
                        />
                      }
                    />
                    <Typography variant="body2" color="text.secondary">
                      Quantidades aceitam até três casas decimais. Configuração local, sem gerar
                      movimentações.
                    </Typography>
                  </>
                )}
              </Stack>
            </SectionCard>
          )}
          {step === 3 && (
            <SectionCard title="Precificação" sx={card}>
              <Stack spacing={2}>
                {money('priceCents', 'Preço de venda', true)}
                <Box sx={grid}>
                  {product && money('costCents', 'Preço de custo')}
                  {field('margin', 'Margem (%)')}
                  {money('promotionPriceCents', 'Preço promocional')}
                  {field('promotionStart', 'Início da promoção', false, 'date')}
                  {field('promotionEnd', 'Fim da promoção', false, 'date')}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Margem e promoção são configurações locais. Não recalculam o preço de venda automaticamente.
                </Typography>
              </Stack>
            </SectionCard>
          )}
        </Stack>
        <Box
          sx={{
            minWidth: 0,
            '@media(min-width:900px)': {
              position: 'sticky',
              top: 96,
              maxHeight: 'calc(100dvh - 190px)',
              overflowY: 'auto'
            }
          }}
        >
          <ProductSummary item={form} />
        </Box>
      </Box>
      <StickyFormActions>
        <CancelButton disabled={busy} onClick={cancel}>
          Cancelar
        </CancelButton>
        <Stack direction="row" spacing={1}>
          {step > 0 && (
            <Button disabled={busy} onClick={() => showStage(step - 1)}>
              Voltar
            </Button>
          )}
          {step < 3 ? (
            <Button type="submit" variant="contained" disabled={busy}>
              Próximo
            </Button>
          ) : (
            <Submit type="submit" variant="contained" disabled={busy}>
              {busy ? 'Salvando...' : initial ? 'Salvar alterações' : 'Salvar produto'}
            </Submit>
          )}
        </Stack>
      </StickyFormActions>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm === 'cancel'
            ? 'Descartar alterações?'
            : confirm === 'status'
              ? 'Salvar alteração de status?'
              : 'Alterar tipo do item?'
        }
        description={
          confirm === 'cancel'
            ? 'Os dados não salvos serão descartados.'
            : confirm === 'status'
              ? 'O status será salvo junto com os dados do item.'
              : 'Os valores permanecem no rascunho ao voltar de tipo. Ao salvar, campos exclusivos do tipo anterior serão descartados; serviços não controlam estoque.'
        }
        confirmLabel={confirm === 'cancel' ? 'Descartar' : 'Confirmar'}
        loading={busy}
        onClose={() => setConfirm('')}
        onConfirm={() => {
          if (confirm === 'cancel') navigate('/products');
          else if (confirm === 'status') save();
          else {
            change('type', confirm);
            setConfirm('');
          }
        }}
      />
    </Box>
  );
}
ProductStepForm.propTypes = { initial: PropTypes.object };

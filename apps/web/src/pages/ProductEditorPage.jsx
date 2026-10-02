import { NcmField } from '../features/ncm/NcmField.jsx';
import { ncmModule } from '../features/ncm/ncm-module.js';
import { resolveProductNcm } from '../features/ncm/mockNcmRepository.js';
import { UnitField } from '../features/units/UnitField.jsx';
import { unitModule } from '../features/units/unit-module.js';
import { resolveProductUnit } from '../features/units/mockUnitsRepository.js';
import { GroupField } from '../features/product-groups/GroupField.jsx';
import { groupModule } from '../features/product-groups/group-module.js';
import { useLookupSource } from '../features/catalog-lookups/lookup-queries.js';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import PropTypes from 'prop-types';
import { Alert, Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { CreateButton } from '../components/common/CreateButton.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { businessCardSx, businessFormSx } from '../components/business/business-styles.js';
import { MoneyField } from '../components/business/MoneyField.jsx';
import { EntityModuleContext } from '../features/parties/entity-module.js';
import { EntityDemoNotice } from '../features/parties/EntityShared.jsx';
import { useEntityDetail, useEntityMutation } from '../features/parties/entity-queries.js';
import { productModule } from '../features/products/product-module.js';
import { emptyProduct, validateProduct } from '../features/products/product-model.js';
import { itemTypeLabel } from '../features/products/product-options.js';
import { ProductProfile, ProductSummary } from '../features/products/ProductShared.jsx';
import { BrandField } from '../features/brands/BrandField.jsx';
import { useBrandsSource } from '../features/brands/brands-queries.js';

// Catálogo único: o formulário muda somente as seções do tipo, mantendo preço/código em ambos.
export function ProductEditorPage({ mode }) {
  return (
    <EntityModuleContext.Provider value={productModule}>
      <Editor mode={mode} />
    </EntityModuleContext.Provider>
  );
}
ProductEditorPage.propTypes = { mode: PropTypes.oneOf(['create', 'edit', 'view']).isRequired };
function Editor({ mode }) {
  const { id } = useParams();
  const query = useEntityDetail(mode === 'create' ? null : id);
  const title =
    mode === 'create'
      ? 'Cadastrar produto ou serviço'
      : mode === 'edit'
        ? `Editar ${query.data ? itemTypeLabel(query.data.type).toLowerCase() : 'item'}`
        : 'Detalhes do item';
  return (
    <>
      <PageHeader
        title={title}
        description={
          mode === 'create'
            ? 'Preencha os dados do item que será comercializado.'
            : 'Consulte os dados e configurações do item.'
        }
        action={
          <Button component={Link} to="/products" variant="outlined" startIcon={<ArrowBackIcon />}>
            Voltar para a lista
          </Button>
        }
      />
      {!import.meta.env.DEV ? (
        <Alert severity="info">Catálogo aguarda integração com o backend.</Alert>
      ) : (
        <>
          <EntityDemoNotice />
          {mode !== 'create' && query.isPending ? (
            <LoadingState message="Carregando item..." />
          ) : query.isError ? (
            <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
          ) : mode !== 'create' && !query.data ? (
            <EmptyState
              title="Item não encontrado."
              description="O item não está disponível neste contexto."
              action={
                <Button component={Link} to="/products">
                  Voltar para a lista
                </Button>
              }
            />
          ) : mode === 'view' ? (
            <ProductProfile item={query.data} />
          ) : (
            <ProductForm key={id ?? 'new'} initial={mode === 'create' ? null : query.data} />
          )}
        </>
      )}
    </>
  );
}
Editor.propTypes = ProductEditorPage.propTypes;
function ProductForm({ initial }) {
  const { repository: ncmRepository } = useLookupSource(ncmModule);
  const { repository: unitsRepository } = useLookupSource(unitModule);
  const { repository: groupsRepository } = useLookupSource(groupModule);
  const { repository: brandsRepository } = useBrandsSource();
  const [form, setForm] = useState(() => ({ ...emptyProduct(), ...initial }));
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const mutation = useEntityMutation();
  const lock = useRef(false);
  const errorRef = useRef(null);
  const navigate = useNavigate();
  const product = form.type === 'PRODUCT';
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const grid = {
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))' },
    gap: 2.5
  };
  const field = (key, label, required = false, maximum = 200) => (
    <TextField
      fullWidth
      label={label}
      value={form[key]}
      required={required}
      onChange={(event) => change(key, event.target.value)}
      slotProps={{ htmlInput: { maxLength: maximum } }}
    />
  );
  const unitField = (
    <UnitField
      value={form.unit}
      unitId={form.unitId}
      initialUnit={initial?.unit}
      initialId={initial?.unitId}
      required={product}
      onChange={(unit) => setForm((old) => ({ ...old, ...unit }))}
    />
  );
  function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    const message = validateProduct(form);
    if (message) {
      setError(message);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    if (initial && initial.status !== form.status) {
      setConfirm(true);
      return;
    }
    save();
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setError('');
    try {
      let data = await resolveProductUnit(unitsRepository, form, initial);
      data = await resolveProductNcm(ncmRepository, data, initial);
      // Reconfere a escolha ao salvar, pois outra aba pode ter inativado a marca.
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
      setConfirm(false);
      setError(cause.message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      lock.current = false;
    }
  }
  const Submit = initial ? Button : CreateButton;
  return (
    <Box component="form" onSubmit={submit} sx={businessFormSx}>
      <ConfirmDialog
        open={confirm}
        title={form.status === 'ACTIVE' ? 'Ativar item?' : 'Inativar item?'}
        description="A alteração de status será salva junto com os dados. O histórico será preservado."
        confirmLabel="Salvar alterações"
        loading={mutation.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={save}
      />
      {error && (
        <Alert ref={errorRef} tabIndex={-1} severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        component="fieldset"
        disabled={mutation.isPending}
        sx={{
          m: 0,
          p: 0,
          border: 0,
          minWidth: 0,
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,1.7fr) minmax(300px,1fr)' },
          gap: 3,
          alignItems: 'start'
        }}
      >
        <Stack spacing={3}>
          <SectionCard
            title="Dados principais"
            icon={product ? Inventory2OutlinedIcon : HandymanOutlinedIcon}
            sx={businessCardSx}
          >
            <Box sx={grid}>
              <TextField
                select
                label="Tipo do item"
                value={form.type}
                onChange={(event) => change('type', event.target.value)}
              >
                <MenuItem value="PRODUCT">Produto</MenuItem>
                <MenuItem value="SERVICE">Serviço</MenuItem>
              </TextField>
              <FormControlLabel
                label="Item ativo"
                control={
                  <Switch
                    checked={form.status === 'ACTIVE'}
                    onChange={(event) => change('status', event.target.checked ? 'ACTIVE' : 'INACTIVE')}
                  />
                }
              />
              {field('name', 'Nome', true)}
              {field('code', 'Código interno', true, 60)}
              <GroupField
                value={form.category}
                groupId={form.groupId}
                initialId={initial?.groupId}
                onChange={(group) => setForm((old) => ({ ...old, ...group }))}
              />
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Descrição"
                value={form.description}
                onChange={(event) => change('description', event.target.value)}
                slotProps={{ htmlInput: { maxLength: 4000 } }}
              />
            </Box>
          </SectionCard>
          {product ? (
            <SectionCard title="Identificação" sx={businessCardSx}>
              <Box sx={grid}>
                {field('gtin', 'Código de barras / GTIN', false, 14)}
                {unitField}
                <NcmField
                  value={form.ncm}
                  ncmId={form.ncmId}
                  initialNcm={initial?.ncm}
                  initialId={initial?.ncmId}
                  onChange={(ncm) => setForm((old) => ({ ...old, ...ncm }))}
                />
                <BrandField
                  value={form.brand}
                  brandId={form.brandId}
                  initialName={initial?.brand}
                  initialId={initial?.brandId}
                  onChange={(brand) => setForm((old) => ({ ...old, ...brand }))}
                />
                {field('manufacturerReference', 'Referência do fabricante')}
              </Box>
            </SectionCard>
          ) : (
            <SectionCard title="Dados do serviço" sx={businessCardSx}>
              <Box sx={grid}>
                {unitField}
                <TextField
                  label="Duração estimada (minutos)"
                  value={form.durationMinutes}
                  onChange={(event) => change('durationMinutes', event.target.value)}
                  slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Descrição do serviço"
                  value={form.serviceDescription}
                  onChange={(event) => change('serviceDescription', event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />
              </Box>
            </SectionCard>
          )}
          <SectionCard title="Valores" sx={businessCardSx}>
            <Box sx={grid}>
              <MoneyField
                label="Preço de venda"
                required
                value={form.priceCents}
                onChange={(value) => change('priceCents', value)}
              />
              {product && (
                <MoneyField
                  label="Preço de custo"
                  value={form.costCents}
                  onChange={(value) => change('costCents', value)}
                />
              )}
            </Box>
          </SectionCard>
          {product && (
            <SectionCard
              title="Configuração de estoque"
              subtitle="Define a participação no controle de estoque. Não altera saldos ou movimentações."
              sx={businessCardSx}
            >
              <Stack spacing={2}>
                <FormControlLabel
                  label="Controla estoque"
                  control={
                    <Switch
                      checked={form.trackStock}
                      onChange={(event) => change('trackStock', event.target.checked)}
                    />
                  }
                />
                {form.trackStock && (
                  <TextField
                    label="Estoque mínimo"
                    value={form.minimumStock}
                    onChange={(event) => change('minimumStock', event.target.value)}
                    slotProps={{ htmlInput: { inputMode: 'decimal', maxLength: 15 } }}
                  />
                )}
              </Stack>
            </SectionCard>
          )}
        </Stack>
        <ProductSummary item={form} />
        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ gridColumn: '1 / -1' }}>
          <Button component={Link} to="/products" variant="outlined" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Submit type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : initial ? 'Salvar alterações' : 'Cadastrar item'}
          </Submit>
        </Stack>
      </Box>
    </Box>
  );
}
ProductForm.propTypes = { initial: PropTypes.object };

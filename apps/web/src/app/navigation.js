import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

export const appRoutes = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    title: 'Dashboard',
    description: 'Uma visão geral dos módulos e das rotinas disponíveis no seu ambiente.',
    icon: DashboardOutlinedIcon
  },
  {
    path: '/customers',
    label: 'Clientes',
    title: 'Clientes',
    description: 'Gerencie os clientes cadastrados neste ambiente.',
    group: 'Cadastros',
    icon: GroupsOutlinedIcon,
    module: true
  },
  {
    path: '/suppliers',
    label: 'Fornecedores',
    title: 'Fornecedores',
    description: 'Organize os fornecedores e parceiros comerciais.',
    group: 'Cadastros',
    icon: LocalShippingOutlinedIcon,
    module: true
  },
  {
    path: '/products',
    label: 'Produtos',
    title: 'Produtos',
    description: 'Consulte o catálogo de produtos e serviços.',
    group: 'Cadastros',
    icon: Inventory2OutlinedIcon,
    module: true
  },
  {
    path: '/inventory',
    label: 'Estoque',
    title: 'Estoque',
    description: 'Acompanhe saldos, movimentações e necessidades de reposição.',
    icon: HandymanOutlinedIcon,
    module: true
  },
  {
    path: '/sales',
    label: 'Vendas',
    title: 'Vendas',
    description: 'Acompanhe pedidos e operações comerciais.',
    icon: PointOfSaleOutlinedIcon,
    module: true
  },
  {
    path: '/financial',
    label: 'Financeiro',
    title: 'Financeiro',
    description: 'Visualize contas a pagar, receber e o fluxo financeiro.',
    icon: AccountBalanceWalletOutlinedIcon,
    module: true
  },
  {
    // A URL histórica é preservada, mas toda nomenclatura apresentada ao usuário segue o modelo Empresa/Loja.
    path: '/admin/companies',
    label: 'Empresas e lojas',
    title: 'Empresas e lojas',
    description: 'Gerencie sua empresa e os estabelecimentos vinculados.',
    group: 'Administração',
    icon: BusinessOutlinedIcon,
    module: true
  },
  {
    path: '/admin/users',
    label: 'Usuários',
    title: 'Usuários',
    description: 'Gerencie quem poderá acessar este ambiente.',
    group: 'Administração',
    icon: ManageAccountsOutlinedIcon,
    module: true
  },
  {
    path: '/admin/plan',
    label: 'Plano',
    title: 'Plano',
    description: 'Consulte o plano e os limites comerciais do ambiente.',
    group: 'Administração',
    icon: ReceiptLongOutlinedIcon,
    module: true
  },
  {
    path: '/settings',
    label: 'Configurações',
    title: 'Configurações',
    description: 'Centralize preferências institucionais e do sistema.',
    icon: SettingsOutlinedIcon,
    module: true
  },
  { path: '/account', label: 'Minha Conta', title: 'Minha Conta', hidden: true }
];

const byPath = Object.fromEntries(appRoutes.map((route) => [route.path, route]));

export const navigationGroups = [
  { items: [byPath['/dashboard']] },
  { label: 'Cadastros', items: [byPath['/customers'], byPath['/suppliers'], byPath['/products']] },
  { items: [byPath['/inventory'], byPath['/sales'], byPath['/financial']] },
  {
    label: 'Administração',
    items: [byPath['/admin/companies'], byPath['/admin/users'], byPath['/admin/plan']]
  },
  { items: [byPath['/settings']] }
];

export const modulePages = appRoutes.filter((route) => route.module);

export function getRouteMetadata(pathname) {
  return byPath[pathname];
}

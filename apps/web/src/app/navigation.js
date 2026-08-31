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

export const navigationGroups = [
  { items: [{ label: 'Dashboard', path: '/dashboard', icon: DashboardOutlinedIcon }] },
  {
    label: 'Cadastros',
    items: [
      { label: 'Clientes', path: '/customers', icon: GroupsOutlinedIcon },
      { label: 'Fornecedores', path: '/suppliers', icon: LocalShippingOutlinedIcon },
      { label: 'Produtos', path: '/products', icon: Inventory2OutlinedIcon }
    ]
  },
  {
    items: [
      { label: 'Estoque', path: '/inventory', icon: HandymanOutlinedIcon },
      { label: 'Vendas', path: '/sales', icon: PointOfSaleOutlinedIcon },
      { label: 'Financeiro', path: '/financial', icon: AccountBalanceWalletOutlinedIcon }
    ]
  },
  {
    label: 'Administração',
    items: [
      { label: 'Empresas e filiais', path: '/admin/companies', icon: BusinessOutlinedIcon },
      { label: 'Usuários', path: '/admin/users', icon: ManageAccountsOutlinedIcon },
      { label: 'Plano', path: '/admin/plan', icon: ReceiptLongOutlinedIcon }
    ]
  },
  { items: [{ label: 'Configurações', path: '/settings', icon: SettingsOutlinedIcon }] }
];

export const modulePages = [
  {
    path: '/customers',
    title: 'Clientes',
    description: 'Gerencie os clientes cadastrados neste ambiente.',
    emptyText: 'Nenhum cliente cadastrado.'
  },
  {
    path: '/suppliers',
    title: 'Fornecedores',
    description: 'Organize os fornecedores e parceiros comerciais.',
    emptyText: 'Nenhum fornecedor cadastrado.'
  },
  {
    path: '/products',
    title: 'Produtos',
    description: 'Consulte o catálogo de produtos e serviços.',
    emptyText: 'Nenhum produto cadastrado.'
  },
  {
    path: '/inventory',
    title: 'Estoque',
    description: 'Acompanhe saldos, movimentações e necessidades de reposição.',
    emptyText: 'Nenhuma movimentação disponível.'
  },
  {
    path: '/sales',
    title: 'Vendas',
    description: 'Acompanhe pedidos e operações comerciais.',
    emptyText: 'Nenhuma venda disponível.'
  },
  {
    path: '/financial',
    title: 'Financeiro',
    description: 'Visualize contas a pagar, receber e o fluxo financeiro.',
    emptyText: 'Nenhum lançamento financeiro disponível.'
  },
  {
    path: '/admin/companies',
    title: 'Empresas e filiais',
    description: 'Administre a estrutura organizacional do ambiente.',
    emptyText: 'Os dados organizacionais aparecerão aqui.'
  },
  {
    path: '/admin/users',
    title: 'Usuários',
    description: 'Gerencie quem poderá acessar este ambiente.',
    emptyText: 'Nenhum usuário disponível para exibição.'
  },
  {
    path: '/admin/plan',
    title: 'Plano',
    description: 'Consulte o plano e os limites comerciais do ambiente.',
    emptyText: 'As informações do plano aparecerão aqui.'
  },
  {
    path: '/settings',
    title: 'Configurações',
    description: 'Centralize preferências institucionais e do sistema.',
    emptyText: 'Nenhuma configuração disponível nesta etapa.'
  }
];

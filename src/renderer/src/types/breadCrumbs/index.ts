type BreadCrumbsItem = {
  path: string;
  label: string;
};

export interface IBreadCrumbs {
  home: string;
  items: BreadCrumbsItem[];
}

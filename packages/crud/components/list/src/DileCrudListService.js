import { LitElement, html, css } from 'lit';

export class DileCrudListService extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
      }
    `
  ];

  static get properties() {
    return {
      config: { type: Object },
      filters: { type: Array },
      pageSize: { type: Number },
      keyword: { type: String },
      paginationData: { type: Object },
      sort: { type: Object },
      belongsTo: { type: String },
      relationId: { type: String },
    };
  }

  constructor() {
    super();
    this.pageSize = 50;
    this.keyword = '';
    this.filters = [];
    this.paginationData = {}
    this.delayTime = 200;
    this.delayTimer = null;
  }

  firstUpdated() {
    // console.log('firstUpdated en service');
    this.ajaxget = this.shadowRoot.getElementById('ajaxget');
    //this.refresh();
  }

  render() {
    return html`
      <dile-ajax
        id="ajaxget"
        method="get"
        url="${this.cleanUrl}"
        @ajax-success="${this.doSuccessGet}"
        @ajax-error="${this.doErrorGet}"
      ></dile-ajax>
    `;
  }

  get cleanUrl() {
    return `${this.config.endpoint}`;
  }

  refresh() {
    if (this.delayTimer) {
      clearTimeout(this.delayTimer);
    }
    if(!this.ajaxget) {
      this.delayTimer = setTimeout(() => this.refresh(), this.delayTime);
    } else {
      // console.log('refresh en service', this.pageSize);
      if (this.delayTimer) {
        clearTimeout(this.delayTimer);
      }
      this.delayTimer = setTimeout(() => this.doRefresh(), this.delayTime);
    }
  }

  doRefresh() {
    this.delayTimer = null;
    let data = {
      per_page: this.pageSize,
      keyword: this.keyword,
      filters: this.filters,
    }
    if (this.sort && this.sort.sortField) {
      data.sortField = this.sort.sortField;
    }
    if (this.sort && this.sort.sortDirection) {
      data.sortDirection = this.sort.sortDirection;
    }
    if (this.belongsTo && this.relationId) {
      data.belongsTo = this.belongsTo;
      data.relationId = this.relationId;
    }
    this.ajaxget.data = data;
    this.ajaxget.generateRequest();
  }

  doSuccessGet(e) {
    // console.log('do success get on service', e.detail);
    let elements = this.config.api.elementListGetter(e.detail);
    let numItems;
    if (this.config.customization.disablePagination) {
      numItems = elements.length;
    } else {
      let data = this.config.api.paginationDataGetter(e.detail);
      console.log('pagination data fetched', data);
      this.paginationData = {
        nextPage: data.result.next_page_url,
        prevPage: data.result.prev_page_url,
        currentPage: data.result.current_page,
      }
      numItems = data.countItems;
    }
    this.dispatchEvent(new CustomEvent('crud-list-get-success', {
      detail: {
        elements,
        numItems,
        paginationData: this.paginationData,
      }
    }));
  }

  doErrorGet(e) {
    this.dispatchEvent(new CustomEvent('crud-list-data-error', {
      bubbles: true,
      composed: true,
      detail: e.detail 
    }));
  }

  goNext() {
    if (this.paginationData.nextPage) {
      this.ajaxget.url = this.paginationData.nextPage;
      this.ajaxget.generateRequest();
    }
  }

  goPrev() {
    if (this.paginationData.prevPage) {
      this.ajaxget.url = this.paginationData.prevPage;
      this.ajaxget.generateRequest();
    }
  }

  setKeyword(keyword) {
    console.log('setkeyword', keyword);
    this.keyword = keyword;
    this.cleanAndRefresh();
  }

  setSort(sortObject) {
    console.log('set SORT OBJECT');
    this.sort = sortObject;
    this.cleanAndRefresh();
  }

  setPageSize(size) {
    // console.log('set page size');
    this.pageSize = size;
    this.cleanAndRefresh();
  }

  setFilters(filters) {
    // console.log('set filters');
    this.filters = filters;
    this.cleanAndRefresh();
  }

  cleanAndRefresh() {
    if(this.ajaxget) {
      this.ajaxget.url = this.cleanUrl;
      this.refresh();
    }
  }
}
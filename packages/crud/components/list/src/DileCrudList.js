import { LitElement, html, css } from 'lit';
import '@dile/ui/components/spinner/spinner.js';
import '@dile/ui/components/button/button.js';
import '../../ajax/ajax.js'
import '../../ui/crud-filters-list.js';
import '../../list/crud-list-pagination-links.js';
import '../crud-list-item.js';
import '../crud-select-all';
import '../crud-list-service.js';

export class DileCrudList extends LitElement {
    static styles = [
        css`
            :host {
                display: block;
                padding: 0 0 1rem 0;
                background-color: #fff;
            }
            
            .prev-summary {
                display: flex;
                flex-direction: column;
                background-color: #999;
                color: white;
                font-size: 0.8em;
                margin-bottom: 0.5rem;
                border-bottom: 1px solid #ccc;
                padding: 0.4rem 1rem;
                line-height: 1.2rem;
            }
            dile-crud-select-all {
                margin: 0.3rem 0.2rem 0.4rem 0;
            }

            .empty, .loading {
                padding: var(--dile-crud-list-empty-padding, 3rem 1rem);
                text-align: center;
            }
            
            @media(min-width: 500px) {
                .prev-summary {
                    flex-direction: row;
                    align-items: center;
                }
                dile-crud-select-all {
                    margin: 0.2rem 0.6rem 0.2rem 0;
                }
            }
        `
    ];

    static get properties() {
      return {
        config: { type: Object },
        elements: { type: Array },
        paginationData: { type: Object },
        numItems: { type: String },
        pageSize: { type: Number },
        keyword: { type: String },
        isSelectAllActive: { type: Boolean },
        loading: { type: Boolean },
        sort: { type: Object },
        actionIds: { type: Array },
        filters: { type: Array },
        
        /*
        idea es colocar todo lo que son datos de config que no cambiarán al usar el elemento
        config = {
          endpoint: string,
          belongsTo: String,
          relationId: String,
          customization: {
            hideCountSummary: false,
            hidePageReport: false,
            hideCheckboxSelection: false,
            hideEmptyInsertButton: false,
            disableInsert: false,
            disableEdit: false,
            disableDelete: false,
            disablePagination: false,
          },
          apiConfig = {
            responseDataProperty: 'data',
            responseMessageProperty: 'message',
            validationErrorsProperty: 'errors',
            getResultsListFromResponse: function // recibe lo que traes por ajax y te da el resultado
            getDataFromResponse: function // recibe lo que traes por ajax y te da la parte que te interesa para encontrar todos los datos, includo la páginación
          }
        }
        */
      };
    }

    constructor() {
        super();
        this.paginationData = {}
        this.elements = [];
        this.pageSize = 50;
        this.keyword = '';
        this.actionIds = [];
        this.filters = [];
        this.delayTime = 200;
        this.delayTimer = null;
        this.isSelectAllActive = false;
        this.loading = true;
    }

    firstUpdated() {
        this.elservice = this.shadowRoot.getElementById('elservice');
        this.ajaxgetallids = this.shadowRoot.getElementById('ajaxgetallids');
        this.refresh();
    }

    updated(changedProperties) {
        if (changedProperties.has('config')) {
            this.refresh();
        }
    }

    render() {
        return html`
            ${this.ajaxTemplate}

            ${this.countSummaryTemplate}

            ${this.filterListTemplate}

            ${this.loading 
                ? this.loadingTemplate 
                : this.elements.length == 0
                    ? this.emptyTemplate
                    : html`
                        ${this.elementsTemplate}
                        ${this.config.customization?.hidePageReport ? '' : this.paginationTemplate}
                    `
            }
        `;
    }

    get filterListTemplate() {
        return html`
            <dile-crud-filters-list
                keyword="${this.keyword}"
                .filters="${this.filters}"
            ></dile-crud-filters-list>
        `
    }

    get countSummaryTemplate() {
        return this.config.customization?.hideCountSummary ? '' : html`
            <div class="prev-summary">
                ${this.config.customization.hideCheckboxSelection
                  ? ''
                  : html`
                    <dile-crud-select-all 
                        @crud-select-all=${this.crudSelectAll}
                        pageSize=${this.pageSize}
                        numItems=${this.numItems}
                        ?disablePagination=${this.config.customization?.disablePagination}
                    ></dile-crud-select-all>
                  `
                }
                <span>
                    ${this.numItems} elementos en total. Mostrando ${this.pageSize} elementos por página.
                </span>
            </div>
        `
    }

    get loadingTemplate() {
        return html`
            <div class="loading">
                <dile-spinner active></dile-spinner>
            </div>
        `;
    }

    get ajaxTemplate() {
        return html`
            <dile-crud-list-service
                id="elservice"
                .config=${this.config}
                .filters=${this.filters}
                .pageSize=${this.pageSize}
                .keyword=${this.keyword}
                .sort=${this.sort}
                @crud-list-get-success=${this.getSuccess}
            ></dile-crud-list-service>
            <dile-ajax
                id="ajaxgetallids"
                method="get"
                url="${this.allIdsUrl}"
                @ajax-success="${this.doSuccessGetIds}"
                @ajax-error="${this.doErrorGet}"
            ></dile-ajax>
        `;
    }
    get emptyTemplate() {
        return html`
            <div class="empty">
                <p>No hay elementos todavía</p>
                ${this.config.customization.disableInsert || this.config.customization?.hideEmptyInsertButton
                    ? ''
                    : html`<p><dile-button @click=${this.dispatchInsertRequest}>Insertar</dile-button></p>`
                }
                
            </div>
        `;
    }
    get elementsTemplate() {
        return html`
            ${this.elements.map(element => html`
                <dile-crud-list-item 
                    itemId="${this.computeItemId(element)}"
                    .actionIds="${this.actionIds}"
                    ?disableEdit="${this.config?.customization?.disableEdit}"
                    ?disableDelete="${this.config?.customization?.disableDelete}"
                    ?hideCheckboxSelection="${this.config?.customization?.hideCheckboxSelection}"
                    @item-checkbox-changed=${this.onItemsCheckboxChanged}
                >
                    ${this.config.itemTemplate(element)}
                </dile-crud-list-item>
            `)}
        `;
    }

    getSuccess(e) {
        console.log('getsuccess en crud list', e.detail);
        this.loading = false;
        this.elements = e.detail.elements;
        this.numItems = e.detail.numItems;
        this.paginationData = e.detail.paginationData;
    }

    computeItemId(element) {
        return element.id;
    }

    get allIdsUrl() {
        return `${this.config.endpoint}/allids`;
    }

    get paginationTemplate() {
        if(! this.config.customization?.disablePagination) {
          return html`
            <dile-crud-list-pagination-links
                  .paginationData=${this.paginationData}
                  numItems="${this.numItems}"
                  pageSize="${this.pageSize}"
                  @crud-pagination-prev=${this.goPrev}
                  @crud-pagination-next=${this.goNext}
            ></dile-crud-list-pagination-links>
          `
        }
    } 

    dispatchInsertRequest() {
        this.dispatchEvent(new CustomEvent('insert-requested', {
            bubbles: true,
            composed: true,
        }));
    }

    goNext() {
        this.elservice.goNext()
    }

    goPrev() {
        this.elservice.goPrev()
    }

    refresh() {
        this.loading = true;
        if (this.isSelectAllActive) {
            this.shadowRoot.querySelector('dile-crud-select-all').reset();
        }
        this.elservice.refresh();
    }    

    setKeyword(keyword) {
        this.keyword = keyword;
        this.elservice.setKeyword(keyword);
    }

    setSort(sortObject) {
        this.sort = sortObject;
        this.elservice.setSort(sortObject);
    }  

    setPageSize(size) {
        this.pageSize = size;
        this.elservice.setPageSize(size);
    }

    setFilters(filters) {
        this.filters = filters;
        this.elservice.setFilters(filters);
    }

    crudSelectAll(e) {
        console.log('crud select all en crud list', e.detail);
        this.isSelectAllActive = e.detail.pageChecked || e.detail.allChecked;
        if (e.detail.pageChecked) {
            this.dispactSelectAll(this.getPageIds());
        } else if (e.detail.allChecked) {
            this.getAllIds();
        } else if (!e.detail.pageChecked && !e.detail.allChecked) {
            this.dispactSelectAll([]);
        }
    }

    dispactSelectAll(ids) {
        this.actionIds = ids;
        console.log('dispactSelectAll', ids);
        this.dispatchEvent(new CustomEvent('crud-list-all-ids-selected', {
            bubbles: true,
            composed: true,
            detail: {
                ids
            }
        }));
    }

    getPageIds() {
        return this.elements.map(element => element.slug);
    }

    getAllIds() {
      if(this.config.customization?.disablePagination) {
        let ids = this.elements.map(item => item.id);
        this.dispactSelectAll(ids);
      } else{
        let data = {
            keyword: this.keyword,
            filters: this.filters,
        }
        if (this.belongsTo && this.relationId) {
            data.belongsTo = this.belongsTo;
            data.relationId = this.relationId;
        }
        // console.log(data);
        this.ajaxgetallids.data = data;
        this.ajaxgetallids.generateRequest();
      }
    }

    doSuccessGetIds(e) {
        this.dispactSelectAll(e.detail);
    }

    onItemsCheckboxChanged(e) {
        if (!e.detail.checked && this.isSelectAllActive) {
            this.shadowRoot.querySelector('dile-crud-select-all').resetWithoutDispatch();
        }
        
    }
}

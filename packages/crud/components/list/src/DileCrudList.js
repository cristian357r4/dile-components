import { LitElement, html, css } from 'lit';
import { deepMerge } from '../../../lib/deepMerge.js';
import { DileLoading, loadingStyles } from '../../../lib/DileLoading.js';
import '@dile/ui/components/button/button.js';
import '../../ajax/ajax.js'
import '../../ui/crud-filters-list.js';
import '../../list/crud-list-pagination-links.js';
import '../crud-list-item.js';
import '../crud-select-all';
import '../crud-list-service.js';

export class DileCrudList extends DileLoading(LitElement) {
    static styles = [
        loadingStyles,
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

            .empty {
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
        numItems: { type: Number },
        pageSize: { type: Number },
        keyword: { type: String },
        isSelectAllActive: { type: Boolean },
        sort: { type: Object },
        actionIds: { type: Array },
        filters: { type: Array },
        belongsTo: { type: String },
        relationId: { type: String },
      };
    }

    constructor() {
        super();
        this.paginationData = {}
        this.elements = [];
        this.pageSize = 10;
        this.keyword = '';
        this.actionIds = [];
        this.filters = [];
        this.delayTime = 200;
        this.delayTimer = null;
        this.isSelectAllActive = false;
        this.loading = true;
    }

    firstUpdated() {
        this.pageSize = this.config.pageSize?.initial ?? this.pageSize;
        this.elservice = this.shadowRoot.getElementById('elservice');
        this.ajaxgetallids = this.shadowRoot.getElementById('ajaxgetallids');
        this.updateComplete.then( () => this.refresh());
        
    }

    // updated(changedProperties) {
    //     if (changedProperties.has('config')) {
    //         console.log('ejecutar refresh con cambiar el config', this.config, changedProperties.get('config'));
    //        this.refresh();
    //     }
    // }

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
                    ${this.numItems != undefined 
                        ? html`
                            ${this.numItems} items in total. ${this.config.customization?.disablePagination ? '' : html`Showing ${this.pageSize} items per page.` }
                          `
                        : 'Loading...' 
                    }
                </span>
            </div>
        `
    }

    get ajaxTemplate() {
        return html`
            <dile-crud-list-service
                id="elservice"
                .config=${this.config}
                .filters=${this.filters}
                pageSize=${this.pageSize}
                .keyword=${this.keyword}
                .sort=${this.sort}
                belongsTo=${this.belongsTo}
                relationId=${this.relationId}
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
                <p>There are no items yet</p>
                ${this.config.customization.disableInsert || this.config.customization?.hideEmptyInsertButton
                    ? ''
            : html`<p><dile-button @click=${this.dispatchInsertRequest}>${this.config.labels.insertAction}</dile-button></p>`
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
                    ${this.config.templates.item(element)}
                </dile-crud-list-item>
            `)}
        `;
    }

    getSuccess(e) {
        // console.log('getsuccess en crud list', e.detail);
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
        this.numItems = undefined;
        if (this.isSelectAllActive) {
            this.shadowRoot.querySelector('dile-crud-select-all').reset();
        }
        this.elservice.refresh();
    }    

    setKeyword(keyword) {
        this.loading = true;
        this.keyword = keyword;
        this.elservice.setKeyword(keyword);
    }

    setSort(sortObject) {
        this.loading = true;
        this.sort = sortObject;
        this.elservice.setSort(sortObject);
    }  

    setPageSize(size) {
        this.loading = true;
        this.pageSize = size;
        this.elservice.setPageSize(size);
    }

    setFilters(filters) {
        this.loading = true;
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
        return this.elements.map(element => element.id);
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
        this.dispactSelectAll(this.config.api.idsGetter(e.detail));
    }

    onItemsCheckboxChanged(e) {
        if (!e.detail.checked && this.isSelectAllActive) {
            this.shadowRoot.querySelector('dile-crud-select-all').resetWithoutDispatch();
        }
        
    }
}

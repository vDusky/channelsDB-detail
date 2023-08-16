namespace LayerResidues.UI{

    import DGComponents = Datagrid.Components;
    import React = LiteMol.Plugin.React
    import LiteMoleEvent = LiteMol.Bootstrap.Event;
    import TunnelUtils = CommonUtils.Tunnels;
    
    let DGTABLE_COLS_COUNT = 2;
    let NO_DATA_MESSAGE = "Hover over channel(2D) for details...";

    declare function $(p:any): any;
    declare function datagridOnResize(str:string,str1:string,str2:string):any;

    interface State{
        data: DataInterface.LayersInfo[] | null,
        app: App,
        layerIdx: number,
        isWaitingForData: boolean
    };

    interface ChannelEventInfo { 
        kind: LiteMol.Bootstrap.Interactivity.Info.__Kind.Selection | LiteMol.Bootstrap.Interactivity.Info.__Kind.Empty,
        source : {
            props: {
                tag: {
                    element: DataInterface.Tunnel,
                    type: String
                }
            },
            ref: string
        }
        
    };

    export function render(target: Element, plugin: LiteMol.Plugin.Controller) {
        LiteMol.Plugin.ReactDOM.render(<App controller={plugin} />, target);
    }

    export class App extends React.Component<{controller: LiteMol.Plugin.Controller }, State> {

        private interactionEventStream: LiteMol.Bootstrap.Rx.IDisposable | undefined = void 0;

        state:State = {
            data: null,
            app: this,
            layerIdx: -1,
            isWaitingForData: false
        };

        layerIdx = -1;

        componentDidMount() {
            $( window ).on('layerTriggered', this.layerTriggerHandler.bind(this));
        }

        private dataWaitHandler(){
            let state = this.state;
            state.isWaitingForData = false;
            this.setState(state);
        }

        public invokeDataWait(){
            if(this.state.isWaitingForData){
                return;
            }

            let state = this.state;
            state.isWaitingForData = true;
            this.setState(state);
            Annotation.AnnotationDataProvider.subscribeForData(this.dataWaitHandler.bind(this));
        }

        private layerTriggerHandler(event:any,layerIdx:number){

            this.layerIdx = layerIdx;

            let data = CommonUtils.Selection.SelectionHelper.getSelectedChannelData();

            let state = this.state;
            if(data!==null){
                state.layerIdx = layerIdx;
                state.data = data.LayersInfo;
                this.setState(state);
            }
            else{
                state.layerIdx = layerIdx;
                this.setState(state);
            }
            
            setTimeout(function(){
                $( window ).trigger('contentResize');
            },1);
        }

        componentWillUnmount(){
        }

        render() {
            if (this.state.data !== null && this.state.layerIdx>=0) {
                return(
                    <div>
                        <DGTable {...this.state} />
                    </div>
                    );
            } 
            
            return <div>
                        <DGNoData {...this.state} />
                    </div>
        }
    }  

    class DGNoData extends React.Component<State,{}>{
        render(){
            return (<div className="datagrid" id="dg-layer-residues">
						<div className="header">
							<DGHead {...this.props}/>			
						</div>
						<div className="body">
                            <table>
                                <DGComponents.DGNoDataInfoRow columnsCount={DGTABLE_COLS_COUNT} infoText={NO_DATA_MESSAGE}/>
                                <DGComponents.DGRowEmpty columnsCount={DGTABLE_COLS_COUNT}/>
                            </table>
						</div>
					</div>);
        }
    }

    class DGTable extends React.Component<State,{}>{
        render(){
            return (<div className="datagrid" id="dg-layer-residues">
						<div className="header">
							<DGHead {...this.props}/>			
						</div>
						<div className="body">
                            <DGBody {...this.props} />
						</div>
					</div>);
        }
    }

    class DGHead extends React.Component<State,{}>{
        render(){
            return(
                <table>
                    <tr>
                        <th title="Residue" className="col col-1">
                            Residue
                        </th>
                        <th title="Annotation" className="col col-2">
                            Annotation
                        </th>                             
                    </tr>
                </table>
            );
        };
    }

    class DGBody extends React.Component<State,{}>{ 
        private generateLink(annotation:Annotation.ResidueAnnotation){
            if(annotation.reference===""){
                return (annotation.text!== void 0 && annotation.text !== null)?<span>{annotation.text}</span>:<span className="no-annotation"/>;
            }
            return <a target="_blank" href={annotation.link} dangerouslySetInnerHTML={{__html:annotation.text}}></a>
        }    

        private shortenBackbone(residue:string){
            return residue.replace(/Backbone/g,'');
        }

        private isBackbone(residue:string){
            return residue.indexOf("Backbone") >= 0;
        }

        private generateSpannedRows(residue:string, annotations: Annotation.ResidueAnnotation[]){
            let trs:JSX.Element[] = [];

            let residueNameEl = (this.isBackbone(residue))?<i><strong>{this.shortenBackbone(residue)}</strong></i>:<span>{residue}</span>;

            let first = true;
            for(let annotation of annotations){
                if(first === true){
                    first = false;
                    trs.push(
                        <tr>
                            <td title={(this.isBackbone(residue)?residue:"")} className={`col col-1 ${(this.isBackbone(residue)?"help":"")}`} rowSpan={(annotations.length>1)?annotations.length:void 0}>
                                {residueNameEl}
                            </td>    
                            <td className={`col col-2`} >
                                {this.generateLink(annotation)}
                            </td>
                        </tr>
                    );
                }
                else{
                   trs.push(
                        <tr>    
                            <td className={`col col-2`} >
                                {this.generateLink(annotation)}
                            </td>
                        </tr>
                    ); 
                }
            }
            return trs;
        }

        private generateRows(){
            if(this.props.data === null){
                return <DGComponents.DGNoDataInfoRow columnsCount={DGTABLE_COLS_COUNT} infoText={NO_DATA_MESSAGE}/>;
            }

            let layerData = this.props.data[this.props.layerIdx].Residues;
            let rows:JSX.Element[] = [];
            
            for(let residue of layerData){
                let residueId = residue.split(" ").slice(1,3).join(" ");
                
                let annotation;
                let annotationText = "";
                let annotationSource = "";

                annotation = Annotation.AnnotationDataProvider.getResidueAnnotations(residueId);
                let residueNameEl = (this.isBackbone(residue))?<i><strong>{this.shortenBackbone(residue)}</strong></i>:<span>{residue}</span>;
                if(annotation === void 0){
                    this.props.app.invokeDataWait();
                    rows.push(
                        <DGComponents.DGElementRow columns={[residueNameEl,<span>Annotation data still loading...</span>]} title={[(this.isBackbone(residue)?residue:""),(this.isBackbone(residue)?residue:"")]} trClass={(this.isBackbone(residue)?"help":"")} />
                    );
                }
                else if(annotation !== null && annotation.length>0){
                    rows = rows.concat(
                        this.generateSpannedRows(residue,annotation)
                    );
                }
                else{
                    rows.push(
                        <DGComponents.DGElementRow columns={[residueNameEl,<span/>]} title={[(this.isBackbone(residue)?residue:""),(this.isBackbone(residue)?residue:"")]} trClass={(this.isBackbone(residue)?"help":"")} />
                    );
                }
            }            
            rows.push(<DGComponents.DGRowEmpty columnsCount={DGTABLE_COLS_COUNT} />);

            return rows;
        }

        render(){
            let rows = this.generateRows();
            
            return(
                <table>
                    {rows}
                </table>
            );
        };
    }    

}
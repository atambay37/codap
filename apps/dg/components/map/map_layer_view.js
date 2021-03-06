// ==========================================================================
//                            DG.MapLayerView
//
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

/* global L */
/** @class  DG.MapLayerView

 A view on a map.

 We're using Leaflet as our map library.
 See: http://leafletjs.com/index.html

 @extends SC.Object
 */
DG.MapLayerView = SC.View.extend(
    /** @scope DG.MapLayerView.prototype */ {

      model: null,

      _layerID: null,

      _map: null,

      map: function () {
        return this._map;
      }.property('_map'),

      baseMapLayer: null,
      baseMapLabels: null,

      didCreateMap: function (iMap) {
      },

      /**
       * Property that can be observed by parent view
       */
      displayChangeCount: 0,

      /**
       * Set along with displayChangeCount so that event can be logged
       * @property(String}
       */
      lastEventType: null,

      /**
       * Property that can be observed by parent view
       */
      clickCount: 0,

      init: function () {
        sc_super();
      },

      /**
       * Provide an element on which we can draw.
       * @param ctx
       * @param first
       */
      render: function (ctx, first) {
        if (first) {
          this._layerID = ctx.push(
              '<div></div>'
          ).id();
        }
      },

      didCreateLayer: function () {
        // TODO: Investigate whether there is some later time to call _createMap so we don't have to use invokeLast
        this.invokeLast(this._createMap);
      },

      _createMap: function () {

        var onLayerAdd = function (iLayerEvent) {
            var tParentView = this.get('parentView');
              this._map.off('layeradd', onLayerAdd);
              tParentView.addPointLayer();
              tParentView.addAreaLayer();
              tParentView.addGridLayer();
            }.bind(this);

        if (this._map) {
          // May need to resize here
        } else {
          this._map = L.map(this._layerID, { scrollWheelZoom: false })
              .setView(this.getPath('model.center'), this.getPath('model.zoom'));
          this._map.on('layeradd', onLayerAdd);
          this.backgroundChanged(); // will initialize baseMap
        }
      },

      viewDidResize: function () {
        var tMap = this.get('map');
        if (tMap) {
          tMap.invalidateSize();
        }
      },

      backgroundChanged: function() {
        var tMap = this.get('map'),
            tNewLayerName = this.getPath('model.baseMapLayerName'),
            tNewLayer;

        var onDisplayChangeEvent = function (iEvent) {
              this.set('lastEventType', iEvent.type);
              this.incrementProperty('displayChangeCount');
            }.bind(this),

            onClick = function (iEvent) {
              this.incrementProperty('clickCount');
            }.bind(this);

        if(!tNewLayerName)
          return;
        if( this.get('baseMapLayer'))
          tMap.removeLayer( this.get('baseMapLayer'));
        if( this.get('baseMapLabels'))
          tMap.removeLayer( this.get('baseMapLabels'));
        tNewLayer = L.esri.basemapLayer( tNewLayerName);
        this._map.addLayer(tNewLayer, true /*add at bottom */)
            .on('dragstart', onDisplayChangeEvent)
            .on('drag', onDisplayChangeEvent)
            .on('dragend', onDisplayChangeEvent)
            .on('move', onDisplayChangeEvent)
            .on('zoomend', onDisplayChangeEvent)
            .on('moveend', onDisplayChangeEvent)
            .on('click', onClick);
        //this._map.addLayer( L.esri.basemapLayer(tBasemap + 'Labels'));
        this.set('baseMapLayer', tNewLayer);
      }.observes('model.baseMapLayerName')

    }
);

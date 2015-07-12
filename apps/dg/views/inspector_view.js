// ==========================================================================
//                          DG.InspectorView
// 
//  An inspector that reconfigures based on selected tile
//  
//  Author:   William Finzer
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('views/draggable_view');
/** @class

    InspectorView floats above tiles, pinned to the right edge. I reconfigures based on
 currently selected tile.

 @extends DG.DraggableView
 */
DG.InspectorView = DG.DraggableView.extend(SC.FlowedLayout,
    /** @scope DG.InspectorView.prototype */
    (function () {

      return {
        classNames: ['inspector-palette'],
        isResizable: false,
        isClosable: false,
        defaultFlowSpacing: { top: 9, left: 9 },
        canWrap: false,
        align: SC.ALIGN_TOP,
        rescaleButton: null,
        cover: null,

        componentContainer: null,
        targetComponent: null,

        init: function() {
          sc_super();
          var this_ = this;

          this.rescaleButton = DG.IconButton.create( {
            layout: { width: 32 },
            //flowSpacing: { left: 5, top: 7, right: 5 },
            iconName: static_url('images/icon-scaleData.svg'),
            depressedIconName: static_url('images/icon-scaleData.svg'),
            target: this,
            action: this_.rescale,
            toolTip: 'DG.Inspector.rescale.toolTip',  // "Rescale graph axes to encompass data"
            localize: true,
            iconExtent: { width: 32, height: 32 }
          });
          this.appendChild( this.rescaleButton);

          this.cover = SC.View.create( {
            useAbsoluteLayout: true,
            classNames: 'inspector-cover draggable'.w()
          });
          this.appendChild( this.cover);
        },

        rescale: function() {
          var tPlot = this.getPath('targetComponent.contentView.model.plot');
          if( tPlot && tPlot.rescaleAxesFromData)
            tPlot.rescaleAxesFromData(true /* allowAxisRescale */, true /* Animate action */,
                true /* log it */, true /* user action */);
        },

        targetComponentDidChange: function() {
          this.setPath('cover.isVisible', SC.none( this.get('targetComponent')));
        }.observes('targetComponent'),

        selectedComponentDidChange: function() {
          this.set('targetComponent', this.getPath('componentContainer.selectedChildView'))
        }.observes('*componentContainer.selectedChildView'),

        /**
         * Called during drag
         * @param iEvent
         * @param iInfo {pageX: mouse starting X
                         pageY: pageY, mouse starting Y
                         left: original layout.left
                         top: original layout.top,
                         height: original layout.height,
                         width: original layout.width }
         */
        dragAdjust: function (iEvent, iInfo) {
          var tScrollView = DG.mainPage.mainPane.scrollView,
              tScrollFrame = tScrollView.get('frame'),
              tMouseMovedY = iEvent.pageY - iInfo.pageY,
              tNewTop = iInfo.top + tMouseMovedY;
          tNewTop = Math.max( tScrollFrame.y, tNewTop);
          tNewTop = Math.min( tNewTop, tScrollFrame.y + tScrollFrame.height - iInfo.height);
          this.adjust('top', tNewTop);
        }

      };  // object returned closure
    }()) // function closure
);


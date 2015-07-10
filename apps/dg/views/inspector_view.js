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

/** @class

  InspectorView floats above tiles, pinned to the right edge. I reconfigures based on
 currently selected tile.

 @extends SC.View
 */
DG.InspectorView = SC.View.extend(
  /** @scope DG.InspectorView.prototype */
  (function () {


    return {
      classNames: ['inspector-palette'],
      isResizable: false,
      isClosable: false
    };  // object returned closure
  }()) // function closure
);


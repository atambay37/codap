// ==========================================================================
//                          DG.ComponentView
// 
//  Routines for changing coordinates along an animation path
//  
//  Author:   William Finzer
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('views/titlebar_button_view');
sc_require('views/titlebar_gear_view');

/** @class

  DragBorderView is typically a thin view configured to lie on the border of a component
 view. It implements the dragging functionality except for the actual change in the
 frame's layout.

 @extends SC.View
 */
DG.DragBorderView = SC.View.extend(
  (function () {

    return {
      /** @scope DG.DragBorderView.prototype */
      dragCursor: null,
      cursor: function () {
        if (this.parentView.get('isResizable'))
          return this.dragCursor;
        else
          return null;
      }.property('dragCursor').cacheable(),
      mouseDown: function (evt) {
        DG.globalEditorLock.commitCurrentEdit();
        var tView = this.viewToDrag();
        // Make sure the enclosing view will be movable
        DG.ViewUtilities.convertViewLayoutToAbsolute(tView);
        // A click on a border should bring the view to the front
        tView.bringToFront();
        if (!this.canBeDragged())
          return NO;  // We won't get other events either
        tView.get('parentView').coverUpComponentViews('cover');

        var layout = this.viewToDrag().get('layout');
        this._mouseDownInfo = {
          pageX: evt.pageX, // save mouse pointer loc for later use
          pageY: evt.pageY, // save mouse pointer loc for later use
          left: layout.left,
          top: layout.top,
          height: layout.height,
          width: layout.width
        };
        return YES; // so we get other events
      },

      mouseUp: function (evt) {
        var tContainer = this.viewToDrag().get('parentView'),
            tOldLayout = this._mouseDownInfo,
            tNewLayout = this.viewToDrag().get('layout'),
            isResize = (!SC.none(this.getPath('cursor.cursorStyle'))) && this.getPath('cursor.cursorStyle').indexOf('-resize') !== -1;
        // apply one more time to set final position
        this.mouseDragged(evt);
        this._mouseDownInfo = null; // cleanup info
        tContainer.coverUpComponentViews('uncover');
        tContainer.set('frameNeedsUpdate', true);
        if( (tOldLayout.left !== tNewLayout.left) || (tOldLayout.top !== tNewLayout.top) ||
            (tOldLayout.height !== tNewLayout.height) || (tOldLayout.width !== tNewLayout.width)) {

          DG.UndoHistory.execute(DG.Command.create({
            name: (isResize ? 'component.resize' : 'component.move'),
            undoString: (isResize ? 'DG.Undo.componentResize' : 'DG.Undo.componentMove'),
            redoString: (isResize ? 'DG.Redo.componentResize' : 'DG.Redo.componentMove'),
            execute: function() { DG.dirtyCurrentDocument(); },
            undo: function() {
              this.viewToDrag().set('layout', tOldLayout);
              tContainer.set('frameNeedsUpdate', true);
            }.bind(this),
            redo: function() {
              this.viewToDrag().set('layout', tNewLayout);
              tContainer.set('frameNeedsUpdate', true);
            }.bind(this)
          }));
        }
        return YES; // handled!
      },

      mouseDragged: function (evt) {
        var info = this._mouseDownInfo;

        if (info) {
          this.dragAdjust(evt, info);
          return YES; // event was handled!
        }
        else
          return NO;
      },
      canBeDragged: function () {
        return NO;  // default
      },
      touchStart: function (evt) {
        return this.mouseDown(evt);
      },
      touchEnd: function (evt) {
        return this.mouseUp(evt);
      },
      touchesDragged: function (evt, touches) {
        return this.mouseDragged(evt);
      },
      dragAdjust: function (evt, info) {
        // default is to do nothing
      },
      viewToDrag: function () {
        return DG.ComponentView.findComponentViewParent(this);
      },
      getContainerWidth: function () {
        return window.innerWidth; // go global
      },
      getContainerHeight: function () {
        var tDocView = this.viewToDrag();
        while (!SC.none(tDocView.parentView.parentView)) {
          tDocView = tDocView.parentView;
        }
        return window.innerHeight - tDocView.get('frame').y;
      }
    };
  }())
);

/** @class

  ComponentView provides a draggable and resizable container for components such as plots and
 tables. The structure is as follows:
 - outerView
 - containerView is inset by the border width
 - titlebarView
 - contentView passed in by clients positioned under the titlebarView
 - 4 drag views laid on top of the containerView's borders and allowing resize

 @extends SC.View
 */
DG.ComponentView = SC.View.extend(
  /** @scope DG.ComponentView.prototype */
  (function () {
    var kTitleBarHeight = DG.ViewUtilities.kTitleBarHeight,
      kMinSize = 50,
      kDragWidth = DG.ViewUtilities.kDragWidth,
      kBorderWidth = DG.ViewUtilities.kBorderWidth,
      kRightBorderCursor = SC.Cursor.create({ cursorStyle: SC.E_RESIZE_CURSOR }),
      kBottomBorderCursor = SC.Cursor.create({ cursorStyle: SC.S_RESIZE_CURSOR }),
      kLeftBorderCursor = SC.Cursor.create({ cursorStyle: SC.W_RESIZE_CURSOR }),
      kCornerBorderCursor = SC.Cursor.create({ cursorStyle: SC.SE_RESIZE_CURSOR })
      ;
    return {
      classNames: ['component-view'],
      isResizable: YES,
      isClosable: YES,
      contentView: SC.outlet('containerView.contentView'),
      childViews: 'containerView borderRight borderBottom borderLeft borderTop borderCorner'.w(),
      containerView: SC.View.design({
        layout: { left: 0, bottom: 0, right: 0 },
        childViews: 'titlebar coverSheet'.w(),
        titlebar: DG.DragBorderView.design({
          layout: { height: kTitleBarHeight },
          classNames: ['titlebar'],
          childViews: 'statusView versionView closeBox titleView'.w(), // gearView
          titleView: SC.LabelView.design(SC.AutoResize, {
            classNames: ['titleview'],
            isEditable: YES,
            _value: null,
            value: function( key, iValue) {
              if( !SC.none( iValue)) {
                this._value = iValue;
              }
              if( SC.none( this._value)) {
                var tComponentView = DG.ComponentView.findComponentViewParent(this);
                this._value = tComponentView ? tComponentView.getPath('model.title') : '';
              }
              return this._value;
            }.property(),
            originalValue: null,
            inlineEditorDidBeginEditing: function(editor, value) {
              this.set('originalValue', value);
            },
            valueChanged: function() {
              var tComponentView = DG.ComponentView.findComponentViewParent(this);
              tComponentView.setPath('model.title', this.get('value'));
              this.set('originalValue', null);
              return true;
            }.observes('value'),
            mouseDown: function() {
              return true;
            },
            mouseUp: function() {
              this.click();
              return true;
            },
            click: function() {
              this.beginEditing();
              return true;
            }
          }),
          statusView: SC.LabelView.design({
            textAlign: SC.ALIGN_LEFT,
            classNames: ['dg-status-view'],
            layout: { left: 25 },
            value: ''
          }),
          versionView: SC.LabelView.design({
            textAlign: SC.ALIGN_RIGHT,
            classNames:['dg-version-view'],
            layout: { right: 15 },
            value: ''
          }),
          closeBox: DG.TitleBarButtonView.design({
            layout: { left: 0, top: 0, width: kTitleBarHeight, height: kTitleBarHeight },
            classNames:['dg-close-view'],
            scale: SC.SCALE_NONE,
            isVisible: false
          }),
          mouseEntered: function (evt) {
            this.setPath('closeBox.isVisible', true);
            return YES;
          },
          mouseExited: function (evt) {
            this.setPath('closeBox.isVisible', false);
            return YES;
          },
          dragAdjust: function (evt, info) {
            var tOuterView = this.viewToDrag(),
              tX = info.left + (evt.pageX - info.pageX),
              tY = info.top + (evt.pageY - info.pageY),
              tContainerWidth = this.getContainerWidth(),
              tContainerHeight = this.getContainerHeight();

            tX = Math.min(Math.max(tX, -info.width + kMinSize),
                tContainerWidth - kMinSize);
            tOuterView.adjust('left', tX);

            tY = Math.min(Math.max(tY, -kTitleBarHeight / 2),
                tContainerHeight - kTitleBarHeight / 2);
            tOuterView.adjust('top', tY);
          },
          canBeDragged: function () {
            return YES;
          }
        }),
        coverSheet: SC.View.design({
            backgroundColor: DG.RenderingUtilities.kSeeThrough,
            isVisible: false
        }),
        classNames: ['component-border'],
        setContentView: function (iContentView) {
          this.set('contentView', iContentView);
        }

      }), // containerView
      borderRight: DG.DragBorderView.design(
        { layout: { right: 0, width: kDragWidth },
          dragCursor: kRightBorderCursor,
          dragAdjust: function (evt, info) {
            // Don't let user drag right edge off left of window
            var tLoc = Math.max(evt.pageX, kMinSize),
              tNewWidth = info.width + (tLoc - info.pageX);
            // Don't let width of component become too small
            tNewWidth = Math.max(tNewWidth, kMinSize);
            this.parentView.adjust('width', tNewWidth);
          },
          canBeDragged: function () {
            return this.parentView.get('isResizable');
          }
        }),
      borderBottom: DG.DragBorderView.design(
        { layout: { bottom: 0, height: kDragWidth },
          dragCursor: kBottomBorderCursor,
          dragAdjust: function (evt, info) {
            var tNewHeight = info.height + (evt.pageY - info.pageY);
            tNewHeight = Math.max(tNewHeight, kMinSize);
            this.parentView.adjust('height', tNewHeight);
          },
          canBeDragged: function () {
            return this.parentView.get('isResizable');
          }
        }),
      borderLeft: DG.DragBorderView.design(
        { layout: { left: 0, width: kDragWidth },
          dragCursor: kLeftBorderCursor,
          dragAdjust: function (evt, info) {
            var tContainerWidth = this.getContainerWidth(),
              tNewWidth = info.width - (evt.pageX - info.pageX),
              tLoc;
            tNewWidth = Math.max(tNewWidth, kMinSize);
            tLoc = info.left + info.width - tNewWidth;
            if (tLoc < tContainerWidth - kMinSize) {
              this.parentView.adjust('width', tNewWidth);
              this.parentView.adjust('left', tLoc);
            }
          },
          canBeDragged: function () {
            return this.parentView.get('isResizable');
          }
        }),
      borderTop: DG.DragBorderView.design(
        { layout: { top: 0, height: 0 },
          canBeDragged: function () {
            return false;
          }
        }),
      borderCorner: DG.DragBorderView.design(
        { layout: { right: 0, width: 3 * kDragWidth, bottom: 0, height: 3 * kDragWidth },
          dragCursor: kCornerBorderCursor,
          dragAdjust: function (evt, info) {
            // Don't let user drag right edge off left of window
            var tLoc = Math.max(evt.pageX, kMinSize),
              tNewWidth = info.width + (tLoc - info.pageX),
              tNewHeight = info.height + (evt.pageY - info.pageY);
            // Don't let width or height of component become too small
            tNewWidth = Math.max(tNewWidth, kMinSize);
            this.parentView.adjust('width', tNewWidth);
            tNewHeight = Math.max(tNewHeight, kMinSize);
            this.parentView.adjust('height', tNewHeight);
          },
          canBeDragged: function () {
            return this.parentView.get('isResizable');
          }
        }),

      _title: '',
      title: function( iKey, iValue) {
        if( iValue) {
          this.setPath('containerView.titlebar.titleView.value', iValue);
          this._title = iValue;
        }
        return this._title;
      }.property(),

      modelTitleChanged: function( iModel, iKey, iValue) {
        if( !SC.none( iValue))
          this.set('title', iValue);
      }.observes('model.title'),

      version: null,
      versionBinding: '.containerView.titlebar.versionView.value',

      status: null,
      statusBinding: '.containerView.titlebar.statusView.value',

      destroy: function () {
        DG.logUser("closeComponent: %@", this.get('title'));
        if (this.containerView.contentView)
          this.containerView.contentView.destroy();
        sc_super();
      },

      /**
       * @property {Object} { action: {function}, target: {Object}, args: {Array}} or null
       */
      closeAction: function () {
        return this.getPath('contentView.closeAction');
      }.property(),

      addContent: function (iView) {
        var tFrame = iView.get('frame');
        if (tFrame.width > 0)
          this.adjust('width', tFrame.width + 2 * kBorderWidth);
        if (tFrame.height > 0)
          this.adjust('height', tFrame.height + 2 * kBorderWidth + kTitleBarHeight);
        iView.set('layout', { top: kTitleBarHeight });
        this.containerView.appendChild(iView);
        this.containerView.setContentView(iView);
      },
      bringToFront: function () {
        this.parentView.bringToFront(this);
      },
      mouseDown: function(evt) {
        this.bringToFront();
        return false;
      },
      contentIsInstanceOf: function( aPrototype) {
        return this.get('contentView') instanceof aPrototype;
      },

      cover: function (iAction) {
        var tContainer = this.get('containerView'),
          tCover = tContainer.get('coverSheet');
        tContainer.removeChild(tCover);
        tContainer.appendChild(tCover);
        tCover.set('isVisible', iAction === 'cover');
      }
    };  // object returned closure
  }()) // function closure
);

DG.ComponentView._createComponent = function (iComponentLayout, iComponentClass,
                                              iContentProperties, iIsResizable, iIsVisible) {
  SC.Benchmark.start('createComponent: '+iComponentClass);

  var tComponentView = DG.ComponentView.create({ layout: iComponentLayout });
  tComponentView.addContent(iComponentClass.create(iContentProperties));

  if (!SC.none(iIsResizable))
    tComponentView.set('isResizable', iIsResizable);
  if (!SC.none(iIsVisible))
    tComponentView.set('isVisible', iIsVisible);

  DG.logUser("componentCreated: %@", iComponentClass);
  SC.Benchmark.end('createComponent: '+iComponentClass);
  SC.Benchmark.log('createComponent: '+iComponentClass);
  return tComponentView;
};

DG.ComponentView.restoreComponent = function (iSuperView, iComponentLayout,
                                              iComponentClass, iContentProperties,
                                              iIsResizable,
                                              iUseLayoutForPosition, iIsVisible) {

  var tComponentView = this._createComponent(iComponentLayout, iComponentClass, iContentProperties,
      iIsResizable, iIsVisible);
  //default to use the existing layout if present, even when requested otherwise.
  if (SC.none(iUseLayoutForPosition)&& !SC.none(iComponentLayout.left) &&
    !SC.none(iComponentLayout.top)) {
    iUseLayoutForPosition = true;
  }
  if (!iUseLayoutForPosition) {
    iSuperView.positionNewComponent(tComponentView);
  }
  iSuperView.appendChild(tComponentView);
  iSuperView.set('frameNeedsUpdate', true);

  return tComponentView;
};

/**
 * Create a component view and add it as a subview to the given super view.
 * @param iSuperView
 * @param iComponentLayout
 * @param iComponentClass - The class of the content view to be contained in the component view
 * @param iContentProperties - These properties are passed to the new instance of the content during creation
 * @param iTitle - The title that appears in the component view's title bar
 * @param iIsResizable
 * @param iUseLayoutForPosition - if true, forgo auto-positioning and just use the layout.
 */
DG.ComponentView.addComponent = function (iSuperView, iComponentLayout, iComponentClass, iContentProperties,
                                          iIsResizable, iUseLayoutForPosition, iIsVisible) {
  iUseLayoutForPosition = iUseLayoutForPosition || false;
  if (!SC.none(iComponentLayout.width))
    iComponentLayout.width += DG.ViewUtilities.horizontalPadding();
  if (!SC.none(iComponentLayout.height))
    iComponentLayout.height += DG.ViewUtilities.verticalPadding();

  var tComponentView = this._createComponent(iComponentLayout, iComponentClass,
      iContentProperties, iIsResizable, iIsVisible);

  if (!iUseLayoutForPosition)
    iSuperView.positionNewComponent(tComponentView);
  iSuperView.appendChild(tComponentView);
  iSuperView.set('frameNeedsUpdate', true);

  // We want to be sure the component view is visible. iSuperView's parent is a scroll view
  // and it can accomplish this for us.
  tComponentView.scrollToVisible();
  return tComponentView;
};

DG.ComponentView.findComponentViewParent = function (iView) {
  // Work our way up the view hierarchy until our parent is a component view (or NULL)
  while (iView && !(iView instanceof DG.ComponentView))
    iView = iView.get('parentView');

  return iView;
};

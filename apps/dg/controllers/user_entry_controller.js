// ==========================================================================
//                      DG.userEntryController
//
//  The controller for managing the user entry dialog.
//
//  Author:   Aaron Unger
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

sc_require('utilities/storage/codap_common_storage');

/** @class

  @extends SC.Object
*/
DG.userEntryController = SC.Object.create( DG.CODAPCommonStorage, (function() {
/** @scope DG.userEntryController.prototype */

  return {
    _dialog: null,

    _statusBinding: SC.Binding.oneWay('DG.authorizationController.currLogin.status'),
    _isPlaceholder: false,

    setup: function() {
      if (SC.none(this.get('_dialog'))) {
        this.set('_dialog', DG.UserEntryDialog.create());
      }

      // this binding gets initialized too early if specified alongside _status, so set it up here.
      SC.Binding.oneWay('DG.currDocumentController*content._isPlaceholder').to('DG.userEntryController._isPlaceholder').connect();
    },

    updateDialog: function() {
      var d = this.get('_dialog');
      if (!SC.none(d)) {
        if (this.get('_status') !== 0 && this.get('_isPlaceholder')) {
          if (!d.get('isAppended')) {
            d.append();
            d.setPath('contentView.choiceButtons.value', ['new']);
          }
        } else {
          d.remove();
        }
      }
    }.observes('_status', '_isPlaceholder', '_dialog'),

    openNewDocument: function() {
      DG.appController.closeAndNewDocument();
      var title = this._dialog.getPath('contentView.choiceViews.contentView.titleField.value');
      if (SC.none(title) || title.length === 0) {
        title = SC.String.loc('DG.Document.defaultDocumentName');
      }
      DG.currDocumentController().set('documentName', title);
      this._dialog.setPath('contentView.choiceViews.contentView.titleField.value', null);
      DG.currDocumentController().setPath('content._isPlaceholder', false);
      if (DG.AUTOSAVE) {
        DG.dirtyCurrentDocument();
      }
    },

    openExistingDocument: function() {
      var dialog = this._dialog.getPath('contentView.choiceViews.contentView');
      DG.appController.openSaveDialog = dialog;
      DG.appController.openDocumentFromDialog();
    },

    openExample: function() {
      var selected = this._dialog.getPath('contentView.choiceViews.contentView.selected');

      if (selected) {
        this._urlForGetRequests( selected.location )
        .notify(this, '_handleResponse',
          function(body) { DG.appController.receivedOpenDocumentSuccess(body, false); },
          function(errorCode) { DG.appController.receivedOpenDocumentFailure(errorCode, false); })
        .send();
        DG.logUser("openExample: '%@'", selected.location);
      }
    },

    openFile: function() {
      var dialog = this._dialog.getPath('contentView.choiceViews.contentView'),
          fileList = dialog.get('value'),
          file = fileList && fileList[0];

      if (file) {
        if ((file.type && file.type === 'application/json')
          || (file.name && file.name.match( /.*\.json/i))) {
          DG.appController.importFileWithConfirmation( file, 'JSON', dialog);
        } else {
          dialog.showAlert(new Error('File, ' + file.name + ' is not of type JSON'));
        }
      }
    }

  }; // return from function closure
}())); // function closure

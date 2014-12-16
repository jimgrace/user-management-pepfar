angular.module('PEPFAR.usermanagement').factory('userActionsService', userActionsService);

function userActionsService(Restangular, $q, userTypesService, dataGroupsService, userService,
                            errorHandler) {
    var availableAgencyActions = [
        'Accept data', 'Submit data', 'Manage users'
    ];
    var availableInterAgencyActions = [
        'Accept data', 'Submit data', 'Manage users'
    ];
    var availablePartnerActions =  [
        'Submit data', 'Manage users'
    ];
    var actions = [
        {name: 'Accept data', userRole: 'Data Accepter'},
        {name: 'Submit data', userRole: 'Data Submitter'},
        {name: 'Manage users', userRole: 'User Administrator'},
        {name: 'Read data', userRole: 'Read Only', default: true}
    ];

    var dataEntryRestrictions = {
        'Inter-Agency': {
            SI: [{
                    userRole: 'Data Entry SI Country Team'
                }, {
                    userRole: 'Tracker'
                }],
            EVAL: [{
                    userRole: 'Data Entry EVAL'
                }]
        },
        Agency: {
            SIMS: [{
                    userRole: 'Data Entry SIMS'
                }]
        },
        Partner: {
            SI: [{
                userRole: 'Data Entry SI'
            }],
            EA: [{
                userRole: 'Data Entry EA'
            }]
        }
    };

    var actionRolesLoaded;

    initialise();
    return {
        getActions: getActions
    };

    function initialise() {
        actionRolesLoaded = Restangular.one('userRoles').withHttpConfig({cache: true}).get({
            fields: 'id,name',
            paging: false
        }).then(function (response) {
            var userRoles = response.userRoles;

            actions.forEach(function (action) {
                action.userRoleId = userRoles.reduce(function (current, value) {
                    if (value.name === action.userRole) {
                        return value.id;
                    }
                    return current;
                }, action.userRoleId);
            });

            addUserRolesForDataEntry(userRoles);

        }, errorHandler.errorFn('Failed to load user roles for actions'));
    }

    function getActions() {
        return $q.when(actionRolesLoaded)
            .then(function () {
                return {
                    actions: actions,
                    dataEntryRestrictions: dataEntryRestrictions,
                    getDataEntryRestrictionDataGroups: getDataEntryRestrictionDataGroups,
                    getActionsForUserType: getActionsForUserType,
                    getActionsForUser: getActionsForUser,
                    getUserRolesForUser: getUserRolesForUser,
                    combineSelectedUserRolesWithExisting: combineSelectedUserRolesWithExisting
                };
            });
    }

    function addUserRolesForDataEntry(userRoles) {
        Object.keys(dataEntryRestrictions).forEach(function (userType) {
            Object.keys(dataEntryRestrictions[userType]).forEach(matchUserRolesWithDataGroups(userRoles, userType));
        });

        function matchUserRolesWithDataGroups(userRoles, userType) {
            return function (dataStream) {
                userRoles.forEach(function (userRole) {
                    var dataStreamRoleList = dataEntryRestrictions[userType][dataStream];

                    dataStreamRoleList.forEach(function (dataStreamRole) {
                        if (userRole && userRole.name === dataStreamRole.userRole) {
                            dataStreamRole.userRoleId = userRole.id;
                        }
                    });
                });
            };
        }
    }

    function getAvailableActionsForUserType(userType) {
        if (typeof userType === 'string') {
            userType = userType.toLowerCase();
        }

        switch (userType) {
            case 'agency':
                return availableAgencyActions;
            case 'partner':
                return availablePartnerActions;
            case 'inter-agency':
                return availableInterAgencyActions;
        }
        return [];
    }

    function getActionsForUserType(userType) {
        var availableActions = getAvailableActionsForUserType(userType);

        return actions.filter(function (action) {
            return (availableActions.indexOf(action.name) >= 0) || action.default;
        });
    }

    function getActionsForUser(user) {
        var actions = getActionsForUserType(userTypesService.getUserType(user));
        var userRoles = (user && user.userCredentials && user.userCredentials.userRoles) || [];
        var userRoleIds = userRoles.map(pick('id'));

        return actionRolesLoaded.then(function () {
            actions.forEach(function (action) {
                action.hasAction = hasUserRoleFor(userRoleIds, action);
            });
            return $q.when(actions);
        });
    }

    function hasUserRoleFor(userRoleIds, action) {
        return (userRoleIds.indexOf(action.userRoleId) >= 0);
    }

    function getUserActionsForNames(selectedActions, actions) {
        var userActions;
        var selectedActionNames = Object.keys(selectedActions)
            .map(function (key) {
                if (selectedActions[key] === true) {
                    return key;
                }
                return undefined;
            }).filter(function (action) {
                return action && action !== '';
            });

        userActions = (actions || []).filter(function (action) {
            return selectedActionNames.indexOf(action.name) >= 0;
        });

        return userActions;
    }

    function getUserRolesForUser(user, dataGroups, actions) {
        var dataGroupsWithEntry;
        var userRoles;
        var dataEntryRoles;
        var userActions = (user && user.userActions) || [];

        dataGroupsWithEntry = userService.getSelectedDataGroups(user, dataGroups)
            .filter(function (dataGroup) {
                return user.dataGroups && user.dataGroups[dataGroup.name] && user.dataGroups[dataGroup.name].entry === true;
            });

        userRoles = getUserActionsForNames(userActions, actions)
            .map(pick('userRoleId', 'userRole'))
            .filter(has('userRoleId'))
            .map(function (item) {
                return {
                    name: item.userRole,
                    id: item.userRoleId
                };
            });

        dataEntryRoles = dataGroupsWithEntry
            .map(pick('userRoles'))
            .reduce(flatten(), []);

        return userRoles.concat(dataEntryRoles);
    }

    function getAvailableUserRoles(dataGroups, actions) {
        var dataGroupRoles = (dataGroups || [])
            .map(pick('userRoles'))
            .reduce(flatten(), []);

        var actionRoles = (actions || [])
            .filter(has('userRoleId'))
            .map(pick('userRole', 'userRoleId'))
            .map(function (item) {
                return {
                    name: item.userRole,
                    id: item.userRoleId
                };
            });

        return [].concat(dataGroupRoles).concat(actionRoles);
    }

    function combineSelectedUserRolesWithExisting(userToEdit, user, dataGroups, actions) {
        var selectedUserRoles = getUserRolesForUser(user, dataGroups, actions);
        var availableUserRoleIds = getAvailableUserRoles(dataGroups, actions).map(pick('id'));
        var currentUserRoles = (userToEdit.userCredentials && userToEdit.userCredentials.userRoles) || [];
        var userRoleBasis = currentUserRoles.filter(function (userRole) {
            return availableUserRoleIds.indexOf(userRole.id) === -1;
        });

        return [].concat(userRoleBasis).concat(selectedUserRoles);
    }

    function getDataEntryRestrictionDataGroups(userType) {
        var userTypeToCheck = getPreferredNameFormat(userType);
        if (!userTypeToCheck || !dataEntryRestrictions[userTypeToCheck]) { return []; }

        return Object.keys(dataEntryRestrictions[userTypeToCheck]);
    }

    function getPreferredNameFormat(userType) {
        if (!angular.isString(userType)) { return ''; }

        return userType.split('-').map(function (namePart) {
            return namePart.charAt(0).toUpperCase() + namePart.substr(1).toLowerCase();
        }).join('-');
    }

    /**********
     * Array functions
     */
    //TODO: Move this out to utils
    function has(property) {
        return function (item) {
            if (item && item[property]) {
                return true;
            }
            return false;
        };
    }

    function pick(property) {
        var properties = Array.prototype.filter.apply(arguments, [angular.isString]);

        if (properties.length === 1 && angular.isString(property)) {
            return function (item) {
                return item[property];
            };
        }

        return function (item) {
            var result = {};
            Object.keys(item).map(function (key) {
                if (properties.indexOf(key) >= 0) {
                    result[key] = item[key];
                }
            });
            return result;
        };
    }

    function flatten() {
        return function (current, items) {
            return (current || []).concat(items);
        };
    }

}

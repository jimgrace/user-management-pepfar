describe('User actions', function () {
    var fixtures = window.fixtures;
    var userActionsService;
    var errorHandler;
    var $httpBackend;
    var userRoleRequest;

    beforeEach(module('PEPFAR.usermanagement', function ($provide) {
        $provide.factory('dataGroupsService', function ($q) {
            var success = $q.when(fixtures.get('dataStreamAccess'));
            return {
                getDataGroupsForUser: function () {
                    return success;
                },
                getDataGroups: jasmine.createSpy('getDataGroups').and.returnValue($q.when([
                    {
                        name: 'SI',
                        userGroups: [
                            {name: 'Data SI access', id: 'c6hGi8GEZot'}
                        ],
                        userRoles: [
                            {name: 'Data Entry SI', id: 'k7BWFXkG6zt'}
                        ]
                    }, {
                        name: 'EA',
                        userGroups: [
                            {name: 'Data EA access', id: 'YbkldVOJMUl'}
                        ],
                        userRoles: [
                            {name: 'Data Entry EA', id: 'OKKx4bf4ueV'}
                        ]
                    }, {
                        name: 'SIMS',
                        userGroups: [
                            {name: 'Data SIMS access', id: 'iuD8wUFz95X'}
                        ],
                        userRoles: [
                            {name: 'Data Entry SIMS', id: 'iXkZzRKD0i4'}
                        ]
                    }
                ]))
            };
        });

        $provide.factory('currentUserService', function ($q) {
            var userServiceObject = {
                returnValue: {
                    userCredentials: {
                        userRoles: [
                            {name: 'Data Entry SIMS', id: 'iXkZzRKD0i4'},
                            {name: 'Data Submitter', id: 'n777lf1THwQ'},
                            {name: 'Read Only', id: 'b2uHwX9YLhu'},
                            {name: 'User Administrator', id: 'KagqnetfxMr'},
                            {name: 'Data Accepter', id: 'QbxXEPw9xlf'}
                        ]
                    },
                    hasAllAuthority: jasmine.createSpy('hasAllAuthority')
                        .and.returnValue(false)
                }
            };

            userServiceObject.getCurrentUser = jasmine.createSpy('getCurrentUser')
                .and.returnValue($q.when(userServiceObject.returnValue));

            return userServiceObject;
        });

        $provide.factory('dataEntryService', function () {
            return {
                dataEntryRoles: {}
            };
        });
    }));

    beforeEach(inject(function ($injector) {
        errorHandler = $injector.get('errorHandler');
        spyOn(errorHandler, 'error');

        userActionsService = $injector.get('userActionsService');

        $httpBackend = $injector.get('$httpBackend');

        userRoleRequest = $httpBackend.expectGET('http://localhost:8080/dhis/api/userRoles?' +
        'fields=id,name&paging=false')
            .respond(200, fixtures.get('userRolesForActions'));
    }));

    afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    it('should be an object', function () {
        $httpBackend.flush();
        expect(userActionsService).toBeAnObject();
    });

    it('should have a getActions method', function () {
        $httpBackend.flush();
        expect(userActionsService.getActions).toBeAFunction();
    });

    describe('actions', function () {
        var userActions;
        var userActionsService;
        var injector;
        var currentUserServiceMock;

        beforeEach(inject(function ($injector) {
            injector = $injector;
            userActionsService = injector.get('userActionsService');
            currentUserServiceMock = $injector.get('currentUserService');
        }));

        it('should return all the user actions', function () {
            var expectedActions = [
                {name: 'Accept data', userRole: 'Data Accepter', userRoleId: 'QbxXEPw9xlf'},
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ'},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true}
            ];

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.filterActionsForCurrentUser(actions.getActionsForUserType('agency'));
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });

        it('should filter the actions based on the current users actions', function () {
            var expectedActions = [
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ'},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true}
            ];

            currentUserServiceMock.returnValue.userCredentials.userRoles = [
                {name: 'Data Submitter', id: 'n777lf1THwQ'},
                {name: 'Read Only', id: 'b2uHwX9YLhu'}
            ];

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.filterActionsForCurrentUser(actions.getActionsForUserType('agency'));
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });

        it('should not return any actions', function () {
            var expectedActions = [];

            currentUserServiceMock.returnValue.userCredentials.userRoles = [];

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.filterActionsForCurrentUser(actions.getActionsForUserType('agency'));
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });

        it('should return all actions for a user with all authorities no matter if the roles are available', function () {
            var expectedActions = [
                {name: 'Accept data', userRole: 'Data Accepter', userRoleId: 'QbxXEPw9xlf'},
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ'},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true}
            ];

            currentUserServiceMock.returnValue.hasAllAuthority.and.returnValue(true);

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.filterActionsForCurrentUser(actions.getActionsForUserType('agency'));
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });
    });

    describe('getActionsForUserType', function () {
        it('should return the user actions available for agencies', function () {
            var userActions;
            var expectedActions = [
                {name: 'Accept data', userRole: 'Data Accepter', userRoleId: 'QbxXEPw9xlf'},
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ'},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true}
            ];
            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.getActionsForUserType('agency');
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });

        it('should return the user actions available for inter-agency', function () {
            var userActions;
            var expectedActions = [
                {name: 'Accept data', userRole: 'Data Accepter', userRoleId: 'QbxXEPw9xlf'},
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ'},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true}
            ];

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.getActionsForUserType('inter-agency');
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });

        it('should return the user actions available for partners', function () {
            var userActions;
            var expectedActions = [
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ'},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true}
            ];

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.getActionsForUserType('partner');
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });

        it('should return the read action as a default', function () {
            var userActions;
            var expectedActions = [
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true}
            ];

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.getActionsForUserType();
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });

        it('should also return the correct data when called with uppercase value', function () {
            var userActions;
            var expectedActions = [
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ'},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true}
            ];

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.getActionsForUserType('partner');
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });

        it('should return only the user actions which have userRoles', function () {
            var userActions;
            var expectedActions = [
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ'},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true}
            ];
            userRoleRequest.respond(200, {userRoles: [
                {id: 'n777lf1THwQ', name: 'Data Submitter'},
                {id: 'b2uHwX9YLhu', name: 'Read Only'}
            ]});

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions.getActionsForUserType('agency');
                });
            $httpBackend.flush();

            expect(userActions).toEqual(expectedActions);
        });
    });

    describe('loading of the userroles', function () {
        it('should load the userroles from the api to get the userrole IDs', function () {
            $httpBackend.flush();
        });

        it('should add the loaded userroles to the right actions', function () {
            var expectedActions;

            userActionsService.getActions()
                .then(function (actions) {
                    expectedActions = actions.actions;
                });
            $httpBackend.flush();

            expect(expectedActions).toEqual(fixtures.get('actionsListWithRoles'));
        });

        it('should call the error function when the request fails', function () {
            userRoleRequest.respond(404);

            $httpBackend.flush();

            expect(errorHandler.error).toHaveBeenCalledWith('Failed to load user roles for actions');
            expect(errorHandler.error.calls.count()).toBe(1);
        });
    });

    describe('getActionsForUser', function () {
        var $httpBackend;
        var $rootScope;
        var userActions;

        beforeEach(inject(function ($injector) {
            $httpBackend = $injector.get('$httpBackend');
            $rootScope = $injector.get('$rootScope');

            userActionsService.getActions().then(function (actions) {
                userActions = actions;
            });
            $httpBackend.flush();
        }));

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('should be a function', function () {
            expect(userActions.getActionsForUser).toBeAFunction();
        });

        it('should get the actions with a hasAction property', function () {
            var user = window.fixtures.get('userGroupsRoles');
            var expectedActions = [
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ', hasAction: false},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true, hasAction: true}
            ];

            userActions.getActionsForUser(user).then(function (actions) {
                userActions = actions;
            });
            $rootScope.$apply();

            expect(userActions).toEqual(expectedActions);
        });

        it('should not give the user any actions', function () {
            var user = window.fixtures.get('userGroupsRoles');
            user.userGroups = [];
            user.userCredentials.userRoles = [];

            var expectedActions = [
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true, hasAction: false}
            ];

            userActions.getActionsForUser(user).then(function (actions) {
                userActions = actions;
            });
            $rootScope.$apply();

            expect(userActions).toEqual(expectedActions);
        });
    });

    describe('getUserRolesForUser', function () {
        var actions = [
            {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ', hasAction: true},
            {name: 'Manage users', userRole: 'User Administrator', userGroupRestriction: true, userRoleId: 'KagqnetfxMr', hasAction: false},
            {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true, hasAction: true}
        ];

        var userActions;
        var dataEntryServiceMock;

        beforeEach(inject(function ($httpBackend, dataEntryService) {
            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions;
                });
            dataEntryServiceMock = dataEntryService;

            $httpBackend.flush();
        }));

        it('should be a function', function () {
            expect(userActions.getUserRolesForUser).toBeAFunction();
        });

        it('should return an empty array', function () {
            expect(userActions.getUserRolesForUser(undefined, undefined, 'Partner')).toEqual([]);
        });

        it('should return the selected datagroup roles', function () {
            dataEntryServiceMock.dataEntryRoles.SI = true;
            var user = {
                dataGroups: {
                    SI: {
                        access: true
                    }
                },
                userActions: {}
            };
            var expectedRoles = [
                {name: 'Data Entry SI', id: 'k7BWFXkG6zt'}
            ];

            expect(userActions.getUserRolesForUser(user, actions, 'Partner')).toEqual(expectedRoles);
        });

        it('should return the general user roles', function () {
            dataEntryServiceMock.dataEntryRoles.SI = true;
            var user = {
                dataGroups: {SI: {
                    access: true
                }},
                userActions: {'Submit data': true}
            };
            var expectedRoles = [
                {name: 'Data Submitter', id: 'n777lf1THwQ'},
                {name: 'Data Entry SI', id: 'k7BWFXkG6zt'}
            ];

            expect(userActions.getUserRolesForUser(user, actions, 'Partner')).toEqual(expectedRoles);
        });

        it('should not give set data entry to true', function () {
            var user = {
                dataGroups: {
                    SI: {
                        access: true,
                        entry: false
                    },
                    EA: {
                        access: true,
                        entry: false
                    }},
                userActions: {'Submit data': true}
            };
            var expectedRoles = [
                {name: 'Data Submitter', id: 'n777lf1THwQ'}
            ];
            expect(userActions.getUserRolesForUser(user, actions, 'Partner')).toEqual(expectedRoles);
        });
    });

    describe('combineSelectedUserRolesWithExisting', function () {
        var dataGroups;
        var user;
        var actions;
        var userActions;
        var dataEntryServiceMock;

        beforeEach(inject(function ($injector) {
            dataGroups = [
                {
                    name: 'SI',
                    access: true,
                    userGroups: [
                        {name: 'Data SI access', id: 'c6hGi8GEZot'}
                    ],
                    userRoles: [
                        {name: 'Data Entry SI', id: 'k7BWFXkG6zt'}
                    ]
                }, {
                    name: 'EA',
                    access: false,
                    userGroups: [
                        {name: 'Data EA access', id: 'YbkldVOJMUl'}
                    ],
                    userRoles: [
                        {name: 'Data Entry EA', id: 'OKKx4bf4ueV'}
                    ]
                }, {
                    name: 'SIMS',
                    access: false,
                    userGroups: [
                        {name: 'Data SIMS access', id: 'iuD8wUFz95X'}
                    ],
                    userRoles: [
                        {name: 'Data Entry SIMS', id: 'iXkZzRKD0i4'}
                    ]
                }
            ];
            user = {
                dataGroups: {SI: {
                    access: true
                }},
                userActions: {'Submit data': true}
            };
            actions = [
                {name: 'Submit data', userRole: 'Data Submitter', userRoleId: 'n777lf1THwQ', hasAction: true},
                {name: 'Manage users', userRole: 'User Administrator', userGroupRestriction: true, userRoleId: 'KagqnetfxMr', hasAction: false},
                {name: 'Read data', userRole: 'Read Only', userRoleId: 'b2uHwX9YLhu', default: true, hasAction: true}
            ];

            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions;
                });
            $httpBackend.flush();

            dataEntryServiceMock = $injector.get('dataEntryService');
        }));

        it('should be a function', function () {
            expect(userActions.combineSelectedUserRolesWithExisting).toBeAFunction();
        });

        it('should return a list of actions', function () {
            var existingUserObject = {
                userCredentials: {
                    userRoles: [
                        {name: 'Some role this user has', id: 'ndnf3ddss'}
                    ]
                }
            };
            var userGroupsAndActions = {
                dataGroups: {
                    SI: {
                        access: true,
                        entry: true
                    }
                },
                userActions: {'Submit data': true}
            };
            var expectedActions = [
                {name: 'Some role this user has', id: 'ndnf3ddss'},
                {name: 'Data Submitter', id: 'n777lf1THwQ'},
                {name: 'Data Entry SI', id: 'k7BWFXkG6zt'}
            ];

            dataEntryServiceMock.dataEntryRoles.SI = true;

            var returnedUserRoles = userActions.combineSelectedUserRolesWithExisting(
                existingUserObject,
                userGroupsAndActions,
                dataGroups,
                actions,
                'Partner'
            );

            expect(returnedUserRoles).toEqual(expectedActions);
        });

        it('should remove roles that are no longer selected', function () {
            var existingUserObject = fixtures.get('userGroupsRoles');
            var userGroupsAndActions = {
                dataGroups: {SI: {
                    access: false,
                    entry: false
                }},
                userActions: {'Submit data': true}
            };

            var returnedUserRoles = userActions.combineSelectedUserRolesWithExisting(
                existingUserObject,
                userGroupsAndActions,
                dataGroups,
                actions,
                'Partner'
            );

            var expectedActions = [
                {name: 'Data Submitter', id: 'n777lf1THwQ'}
            ];

            expect(returnedUserRoles).toEqual(expectedActions);
        });
    });

    describe('getDataEntryRestrictionDataGroups', function () {
        var userActions;

        beforeEach(inject(function () {
            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions;
                });

            $httpBackend.flush();
        }));

        it('should return the correct data groups for partner', function () {
            expect(userActions.getDataEntryRestrictionDataGroups('Partner'))
                .toEqual(['SI', 'EA']);
        });

        it('should return the correct data groups for partner with lowercase', function () {
            expect(userActions.getDataEntryRestrictionDataGroups('partner'))
                .toEqual(['SI', 'EA']);
        });

        it('should return the correct data groups for agency', function () {
            expect(userActions.getDataEntryRestrictionDataGroups('agency'))
                .toEqual(['SIMS', 'SIMS Key Populations']);
        });

        it('should return the correct data groups for inter-agency', function () {
            expect(userActions.getDataEntryRestrictionDataGroups('Inter-Agency'))
                .toEqual(['SI']); /*'EVAL' is also here but is merge into SI*/
        });
    });

    describe('dataEntryRestrictionsUserRoles', function () {
        var userActions;

        beforeEach(inject(function () {
            userActionsService.getActions()
                .then(function (actions) {
                    userActions = actions;
                });

            $httpBackend.flush();
        }));

        it('should have loaded the userRoles for dataEntry restrictions', function () {
            var partnerDataGroups = userActions.dataEntryRestrictions.Partner;

            expect(partnerDataGroups.SI[0].userRoleId).toBe('k7BWFXkG6zt');
        });
    });
});

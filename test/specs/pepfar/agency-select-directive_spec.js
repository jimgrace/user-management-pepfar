describe('Agency select directive', function () {
    var fixtures = window.fixtures;
    var $scope;
    var element;
    var $rootScope;
    var agenciesService;

    beforeEach(module('pepfar/agencypartner-select.html'));
    beforeEach(module('PEPFAR.usermanagement', function ($provide) {
        $provide.factory('agenciesService', function ($q) {
            var success = $q.when(fixtures.get('agenciesList').categoryOptionGroups);
            return {
                getAgencies: jasmine.createSpy('getAgencies')
                    .and.returnValue(success)
            };
        });
    }));

    beforeEach(inject(function ($injector) {
        var innerScope;
        var $compile = $injector.get('$compile');
        $rootScope = $injector.get('$rootScope');
        agenciesService = $injector.get('agenciesService');

        element = angular.element('<agency-select></agency-select>');

        $scope = $rootScope.$new();

        $compile(element)($scope);
        $rootScope.$digest();

        innerScope = element.find('.ui-select-bootstrap').scope();
        innerScope.$select.open = true;
        innerScope.$apply();
    }));

    it('should compile', function () {
        expect(element).toHaveClass('agency-partner-select');
    });

    it('should have all the elements in the list', function () {
        var elements = element[0].querySelectorAll('.ui-select-choices-row');

        expect(elements.length).toBe(fixtures.get('agenciesList').categoryOptionGroups.length);
    });

    it('should have the right placeholder', function () {
        var inputBox = element[0].querySelector('input');

        expect(inputBox.attributes.placeholder.value).toBe('Select an agency');
    });

    it('should have an islolate scope', function () {
        var elements;

        $scope.selectbox = {};
        $scope.$apply();

        elements = element[0].querySelectorAll('.ui-select-choices-row');

        expect(elements.length).toBe(fixtures.get('agenciesList').categoryOptionGroups.length);
    });

    it('should call getAgencies after an event is recieved', function () {
        agenciesService.getAgencies.calls.reset();
        $rootScope.$broadcast('ORGUNITCHANGED', {name: 'Rwanda'});

        expect(agenciesService.getAgencies).toHaveBeenCalled();
    });
});

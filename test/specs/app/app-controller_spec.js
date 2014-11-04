describe('App controller', function () {
    var controller;

    beforeEach(module('ui.router'));
    beforeEach(module('PEPFAR.usermanagement'));
    beforeEach(inject(function ($controller, $rootScope) {
        controller = $controller('appController', {
            scope: $rootScope
        });
    }));

    it('should be an object', function () {
        expect(controller).toBeAnObject();
    });
});
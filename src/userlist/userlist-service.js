angular.module('PEPFAR.usermanagement').factory('userListService', userListService);

function userListService(Restangular, paginationService, errorHandler) {
    var fields = ['id', 'firstName', 'surname', 'email', 'organisationUnits', 'userCredentials[username,disabled,userRoles]', 'userGroups'];
    var filters = [];

    return {
        getList: getList,
        getFullList: getFullList,
        pagination: paginationService,
        setFilter: setFilter,
        getFilters: getFilters,
        resetFilters: resetFilters,
        removeFilter: removeFilter,
        filters: filters
    };

    function getList() {
        return Restangular.one('users')
            .get(getRequestParams(true))
            .then(setPagination)
            .then(extractUsers)
            .catch(errorHandler.errorFn('Unable to get the list of users from the server'));
    }

    function getFullList() {
        return Restangular.one('users')
            .get(getRequestParams())
            .then(extractUsers)
            .catch(errorHandler.errorFn('Unable to get the full list of users from the server'));
    }

    function setPagination(response) {
        if (response.pager) {
            paginationService.setPagination(response.pager);
        }
        return response;
    }

    function extractUsers(response) {
        return response.users || [];
    }

    function getRequestParams(hasPaging) {
        var needsPaging = hasPaging || false;
        var params = {
            fields: fields.join(','),
            filter: undefined,
            manage: 'true'
        };

        if (needsPaging) {
            params.page = paginationService.getCurrentPage();
            params.pageSize = paginationService.getPageSize();
        } else {
            params.paging = false;
        }

        cleanFilters();

        params.filter = filters;

        return params;
    }

    function getFilters() {
        return filters;
    }

    function setFilter(filter) {
        filters.push(filter);
    }

    function resetFilters() {
        filters = [];
    }

    function removeFilter(index) {
        filters.splice(index, 1);
    }

    function cleanFilters() {
        var arr = [];
        for (var i = 0, len = filters.length; i < len; i = i + 1) {
            if (filters[i].length > 0) {
                arr.push(filters[i]);
            }
        }
        filters = arr;
    }
}

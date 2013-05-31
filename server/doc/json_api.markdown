Conventions
===========

Parameters marked with + are required, those marked with * are optional, those marked with ? are
conditional (with conditions explained in the description for the parameter).

URL Path Roots
==============
For V1, all URL paths must start with /bodega/v1/json. All URLs below are relative to this root.
Future versions may be moved to other roots.

Objects
=======

Errors
------
+ string title, a short summary of the error
+ string error, a description of the error
+ string errorId, the ID of the error

Known URLs
==========

Authentication
--------------
    Path: /auth
    Authentication: yes
    Purpose: authenticates a given user.

Parameters:
-----------
+ string auth_user
+ string auth_password
+ string auth_device, the device ID for which to authenticate the user against

Response:
----------
+ boolean authSuccess, true on success and false on failure
* number points, the number of points available to this account to spend
? Error, on failure (authSuccess == false) the reason for failure

    Example:
    https://sample.com/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_device=2


Store Listings
--------------
    Path: /channels
    Authentication: yes
    Purpose: list all channels by name/id for the logged in device
Parameters:
-----------
+ integer offset, offset response from the start
+ integer pageSize, how many items to show

Response:
---------
* List<number> channels, the numeric IDs of channels

Channel Information
-------------------
    Path: /channel/[0-9]+
    Authentication: yes
    Purpose: list the contents of a specific channel; the id is encoded in the URL path

Parameters: <none>
------------------

Response:
---------

##Examples:
    http://sample.com/bodega/v1/json/channels
    http://sample.com/bodega/v1/json/channels?offset=25&pageSize=25

Search
------
    Path: /search
    Authentication: yes
    Purpose: returns assets that match a given search term

Paramaters:
-----------
+ string query
+ number channelId, the channel to search in (will also search in sub-channels)
* number pageSize, the number of matches to return at a time
* number offset, the offset into the match set to start returning from

Asset Information
-----------------
    Path: /asset/<asset id>
    Authentication: yes
    Purpose: retrieves details for a given asset
    Parameters: id, in URL

Response:
---------
+ number id
+ string name
+ string description
+ string license
+ number partnerId (uploading participant)
+ string version
+ string path
+ string image

Points and purchases
--------------------
    Path: /points/redeemCode/<code>
    Authentication: yes
    Purpose: to redeem a pre-purchased code for points

Parameters:
----------
+ (in url) string code to redeem

Response:
---------
* Number of new points, or -1 on error (along with error object)

    Example:
    https://sample.com/bodega/v1/json/points/redeem/111111111

Points Purchase
---------------
    Path: /points/buy
    Authentication: yes
    Purpose: to purchase points

Parameters:
-----------
+ points: number of points to purchase

Response:
--------
    Example:
    https://sample.com/bodega/v1/json/points/buy?points=1000

Asset Download
--------------
    Path: /download/<asset id>
    Authentication: yes
    Purpose: initiates a download for the given asset, or returns an error if the asset is not available or needs to be purchased first
    Parameters: number asset id, in URL
    Response: the contents of the asset file

    Path: /externalDownload/<asset id>
    Authentication: yes
    Purpose: records an asset download from an external URL
    Parameters: number asset id, in URL
    Response: none

Asset management
----------------
    Path: /asset/create
    Authentication: yes
    Purpose: Uploads a new asset along with descriptive information

Parameters:
-----------
* PartnerID (otherwise, uses default partner for the user)
* Multipart uploads of files: asset (the file itself), info (a json file with metadata about the file)

Response:
---------
    Path: /asset/update
    Path: /asset/delete


Collections
-----------
    Path: /collections/list
    Authentication: yes
    Purpose: Lists all collections available to the user

Parameters:
-----------
* integer pageSize, how many items to show (default 10)
* integer offset, offset response from the start (default 0)

Response:
---------
 * List<Collections> where Collection is { integer id, string name, bool public, bool wishlist }


Create Colletions
-----------------
    Path: /collections/create
    Authentication: yes
    Purpose: To create a new collection

Parameters:
----------
+ string name
* bool public
* bool wishlist

Response:
---------
* integer id
* string name
* bool public
* bool wishlist

Delete Collections
------------------
    Path: /collections/delete
    Authentication: yes
    Purpose: To remove a collection
Parameters:
----------
* integer collectionId

Response:
---------
    Returns standard auth information on success, error on failure

Collection List Assets
----------------------
    Path: /collections/listAssets
    Authentication: yes
    Purpose: To list all the assets in a given collection
Parameters:
-----------
+  integer collectionId
* integer pageSize, how many items to show (default 10)
* integer offset, offset response from the start (default 0)

Response:
---------
    +List<Asset>

Collection Add new asset
------------------------
    Path: /collections/addAsset
    Authentication: yes
    Purpose: To add an asset to a collection

Parameters:
-----------
+ integer assetId
+ integer collectionId

Response:
---------
* Collection collection (tuple of: integer id, string name, bool public, bool wishlist)

Collection remove asset
-----------------------
    Path: /collections/removeAsset
    Authentication: yes
    Purpose: Remove an asset from a collection
Parameters:
-----------
+ integer assetId
+ integer collectionId

Response:
---------
* Collection collection (tuple of: integer id, string name, bool public, bool wishlist)


Account Registration
--------------------
Path: /register
Authentication: no
Purpose: list the account history of a given participant
Response:
Parameters:

Path: /register/confirm
Authentication: no
Purpose: list the account history of a given participant
Response:
Parameters:



Account Management
------------------
Path: /participant/resetRequest
Authentication: no
Purpose: sends a password reset email to a given email

Parameters:
-----------
+ string email

Response:
---------

    Path: /participant/resetPassword
    Authentication: no
    Method: get
    Purpose: Renders an html form that allows the user to verify a password reset

    Path: /participant/resetPassword
    Authentication: no
    Method: post
    Purpose: Confirms a password reset and does the actual reset on success
    Parameters:
    Response:

    Path: /participant/resetPassword
    Authentication: no
    Purpose: Renders an html form that allows the user to verify a password reset

Participant change password
---------------------------
    Path: /participant/changePassword
    Authentication: yes
    Purpose: sets a new password for an account
Parameters:
-----------
+ newPassword: the new password string
Response:
---------
* success: true on successful password update, otherwise an error object
    Eample:
    https://sample.com/bodega/v1/json/changePassword?newPassword=thisIsMyNewPassphrase

Participant change account details
----------------------------------
    Path: /participant/changeAccountDetails
    Authentication: yes
    Purpose: change the name or email associated with a participant

Parameters:
-----------
* firstName: the person's first name
* lastName: the person's last name
* email: the person's email address; will be validated before usage
Response:
---------
* success: true on success, otherwise an error object
    Eample:
    https://sample.com/bodega/v1/json/changePassword?firstName=Sally
    https://sample.com/bodega/v1/json/changePassword?firstName=Sally&lastName=Fally
    https://sample.com/bodega/v1/json/changePassword?email=sally@foo.com

Payment Method
--------------
    Path: /participant/paymentMethod
    Authentication: yes
    Purpose: set a payment method (e.g. a credit card) on the account

Parameters:
----------
Response:
---------


Payment Method Delete
---------------------

    Path: /participant/deletePaymentMethod
    Authentication: yes
    Purpose: delete a payment method (e.g. a credit card) on the account

Parameters:
-----------
Response:
---------

Account Information
-------------------
Path: /participant/history
Authentication: yes
Purpose: list the account history of a given participant
Parameters:
-----------
* integer offset, offset response from the start (default 0)
* integer pageSize, how many items to show (default 50)

Response:
---------
* List<Map> list of history items: title, date and description
    Example:
    https://sample.com/bodega/v1/json/participant/history?offset=0&pageSize=20

    Path: /participant/info
    Authentication: yes
    Purpose: retrieve information related to the participant
    Parameters: <none>

Response:
---------
+ assetCount: number of assets in the store belonging (e.g. uploaded by) this participant
+ channelCount: number of channels their assets exist in
+ storeCount: number of stores their assets exist in
+ pointsEarned: number of points earned in the store (all time)
+ pointsOwed: number of points they have owed in the store
+ points: number of points available for spending (pointsOwed + purchased points)
+ organization: name of the organization their account is associate with
+ firstName
+ lastName
+ email


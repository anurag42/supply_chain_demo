pragma solidity ^ 0.4 .11;

contract TradeReg {
  address owner;

  enum docStatus {
    NOT_YET_UPLOADED,
    REVIEW_PENDING,
    PARTIAL_APPROVED,
    APPROVED,
    REJECTED
  }

  /*
      MODIFIERS
    ========================================================================
  */
  /**
   * Set permission so that owner can be the only accessor
   */
  modifier onlyBy() {
    if (msg.sender != owner) {
      throw;
    }
    _;
  }

  struct doc {
    mapping(uint => bytes) versiondir;
    docStatus status;
    uint version;
  }

  struct LetterOfCredit {
    uint noOfDays;
    uint creditAmount;
    docStatus status;
  }

  struct Invoice {
    uint noOfDays;
    uint creditAmount;
    docStatus status;
  }



  struct Trade {
    address[] tradeParties;
    mapping(address => bytes32) tradePartiesRole;
    mapping(bytes32 => address) ethAddressByRole;
    mapping(bytes32 => doc) docByType;
    LetterOfCredit loc;
    Invoice invoice;
    uint256 amount;
    uint256 expiresOn;
    uint256 shippingDate;
    uint256 issueDate;
  }

  mapping(bytes32 => Trade) trades;

  /**
   EVENTS
  */
  event LogTradeCreated(bytes32 indexed uid);
  event LogUpload(bytes32 indexed uid, bytes32 docName, docStatus status);
  event LogApprove(address indexed sender, bytes32 indexed docName, uint time);
  event LogReject(address indexed sender, bytes32 indexed docName);
  event LogGetDoc(bytes32 indexed uid, bytes hash);
  event LogDeposit(bytes32 indexed uid, uint amount);
  event LogPayment(bytes32 indexed uid, string status);

  function TradeReg() {
    owner = msg.sender;
  }

  function initDocs(bytes32 uid) {
    trades[uid].docByType["Quotation"].status = docStatus.NOT_YET_UPLOADED;
  }

  function createTrade(bytes32 uid, address[] tradeParties, bytes32[] tradePartiesRole) {
    trades[uid].tradeParties = tradeParties;
    for (uint i = 0; i < tradeParties.length; i++) {
      trades[uid].tradePartiesRole[tradeParties[i]] = tradePartiesRole[i];
    }
    LogTradeCreated(uid);
  }

  function upload(bytes32 uid, address sender, bytes32 docType, bytes _hash) {
    bytes32 role = trades[uid].tradePartiesRole[sender];
    if (isUploadAllowed(role, docType)) {
      var currIndex = trades[uid].docByType[docType].version++;
      trades[uid].docByType[docType].versiondir[currIndex] = _hash;
      trades[uid].docByType[docType].status = docStatus.REVIEW_PENDING;
      LogUpload(uid, docType, trades[uid].docByType[docType].status);
    } else return;
  }

  function isUploadAllowed(bytes32 role, bytes32 docType) internal returns(bool) {
    bool isAllowed = false;
    if ((role == "buyer" && (docType == "PurchaseOrder" || docType == "RFQ")) ||
      ((role == "seller") && (docType == "Quotation" || docType == "Invoice")) ||
      (role == "shipper" && docType == "BillOfLading")) {
      isAllowed = true;
    }
    return isAllowed;
  }

  function uploadLoc(bytes32 uid, uint _invoiceAmount, uint _noOfDays) {
    trades[uid].invoice.creditAmount = _invoiceAmount;
    trades[uid].invoice.noOfDays = _noOfDays;
    trades[uid].invoice.status = docStatus.REVIEW_PENDING;
    LogUpload(uid, "LetterOfCredit", trades[uid].invoice.status);
  }

  function uploadInvoice(bytes32 uid, uint _invoiceAmount, uint _noOfDays) {
    trades[uid].loc.creditAmount = _invoiceAmount;
    trades[uid].loc.noOfDays = _noOfDays;
    trades[uid].loc.status = docStatus.REVIEW_PENDING;
    LogUpload(uid, "Invoice", trades[uid].loc.status);
  }

  function action(bytes32 uid, address sender, bytes32 docType, bytes32 action, bytes extraData) {
    if (action == "Approve") {
      approve(uid, sender, docType);
    } else if (action == "Reject") {
      reject(uid, sender, docType, extraData);
    }
  }

  function approve(bytes32 uid, address sender, bytes32 docType) internal {
    bytes32 role = trades[uid].tradePartiesRole[sender];
    if (isReviewAllowed(role, docType) && role == "buyer") {
      trades[uid].docByType[docType].status = docStatus.PARTIAL_APPROVED;
      LogApprove(sender, docType, now);
    } else if (isReviewAllowed(role, docType) && role != "buyer") {
        if (role == "seller" && docType == "LetterOfCredit") trades[uid].issueDate = now;
      else if (role == "seller" && docType == "BillOfLading") trades[uid].shippingDate = now;
      trades[uid].docByType[docType].status = docStatus.APPROVED;
      LogApprove(sender, docType, now);
    }
  }

  function reject(bytes32 uid, address sender, bytes32 docType, bytes extraData) internal {
    bytes32 role = trades[uid].tradePartiesRole[sender];
    if (isReviewAllowed(role, docType)) {
      trades[uid].docByType[docType].status = docStatus.REJECTED;
      LogReject(sender, docType);
    } else return;
  }

  function isReviewAllowed(bytes32 role, bytes32 docType) internal returns(bool) {
    bool isAllowed = false;
    if (((role == "buyer") && (docType == "Invoice" || docType == "LetterOfCredit" || docType == "BillOfLading")) ||
      (role == "seller" && (docType == "PurchaseOrder" || docType == "LetterOfCredit" || docType == "RFQ")) ||
      (role == "bank" && (docType == "Invoice" || docType == "BillOfLading")) ||
      (role == "buyer" && docType == "Quotation")) {
      isAllowed = true;
    }
    return isAllowed;
  }

  function getLatestDoc(bytes32 uid, bytes32 docName) returns(bytes) {
    uint latestDocIndex = trades[uid].docByType[docName].version - 1;
    LogGetDoc(uid, trades[uid].docByType[docName].versiondir[latestDocIndex]);
  }

  function getDoc(bytes32 uid, bytes32 docName, uint version) returns(bytes) {
    return trades[uid].docByType[docName].versiondir[version - 1];
  }

  function payToSeller(bytes32 uid) {
    if (now > trades[uid].shippingDate + trades[uid].loc.noOfDays && trades[uid].shippingDate < (trades[uid].issueDate + trades[uid].loc.noOfDays)) {
      trades[uid].ethAddressByRole["seller"].send(trades[uid].loc.creditAmount);
      LogPayment(uid, "True");
    }
    LogPayment(uid, "False");
  }

  function deposit(bytes32 uid) payable {
    LogDeposit(uid, msg.value);
  }
}

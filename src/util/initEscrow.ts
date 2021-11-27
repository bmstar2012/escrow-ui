import { AccountLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { ESCROW_ACCOUNT_DATA_LAYOUT, EscrowLayout } from "./layout";

const connection = new Connection("http://localhost:8899", 'singleGossip');

export const initEscrow = async (
    privateKeyByteArray: string,
    initializerXTokenAccountPubkeyString: string,
    amountXTokensToSendToEscrow: number,
    initializerReceivingTokenAccountPubkeyString: string,
    expectedAmount: number,
    escrowProgramIdString: string) => {

    //Alice private key
    privateKeyByteArray = "113,223,229,89,13,58,127,130,206,85,76,33,145,132,68,185,141,222,232,176,118,79,218,119,235,145,124,174,127,174,83,176,18,70,50,121,121,74,172,111,235,90,2,40,234,215,150,82,135,123,6,187,183,151,62,70,111,25,185,95,119,1,121,98";
    initializerXTokenAccountPubkeyString = "HwkG2NmHfEqtn2hRLrsSu35HFSiz834QUSPoX7ihnyb5"; //X token acc
    amountXTokensToSendToEscrow = 10;
    escrowProgramIdString = "ArKNXpTq2o41N2XsujRuLqQehZUb5bRVFXceWqvH9QWY";
    initializerReceivingTokenAccountPubkeyString = "5CNuZtJ5ksxV6iAAFacu91PYoptzGDLY9exuentmuey3";
    expectedAmount = 15;

    const initializerXTokenAccountPubkey = new PublicKey(initializerXTokenAccountPubkeyString);

    console.log("Step1: ");
    // let accountInfo = (await connection.getAccountInfo(initializerXTokenAccountPubkey, 'singleGossip'));
    // console.log("accountInfo", accountInfo);
    let parsedAccount = (await connection.getParsedAccountInfo(initializerXTokenAccountPubkey, 'singleGossip'));
    console.log("parsedXTokenAccount", parsedAccount);
    // return;

    //@ts-expect-error
    const XTokenMintAccountPubkey = new PublicKey(parsedAccount.value!.data.parsed.info.mint);
    let parsedXTokenMintAccount = (await connection.getParsedAccountInfo(XTokenMintAccountPubkey, 'singleGossip'));
    console.log("parsedXTokenMintAccount", parsedXTokenMintAccount);

    const privateKeyDecoded = privateKeyByteArray.split(',').map(s => parseInt(s));
    const initializerAccount = new Account(privateKeyDecoded);

    console.log("Alice main account", privateKeyDecoded, "Account", initializerAccount, "public key", initializerAccount.publicKey.toBase58());

    console.log("Step2: ");
    const tempTokenAccount = new Account();
    let paramsForTempToken = {
        programId: TOKEN_PROGRAM_ID,
        space: AccountLayout.span,
        lamports: await connection.getMinimumBalanceForRentExemption(AccountLayout.span, 'singleGossip'),
        fromPubkey: initializerAccount.publicKey,
        newAccountPubkey: tempTokenAccount.publicKey
    }
    console.log("Step2 - 1 create Instruction to create temp account for X Token");
    console.log("paramsForTempToken", paramsForTempToken, "temp account", tempTokenAccount.publicKey.toBase58());
    const createTempTokenAccountIx = SystemProgram.createAccount(paramsForTempToken);
    console.log("createTempTokenAccountIx", createTempTokenAccountIx);

    console.log("Step2 - 2 create Instruction to initialize temp account"); //TransactionInstruction
    const initTempAccountIx = Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, XTokenMintAccountPubkey, tempTokenAccount.publicKey, initializerAccount.publicKey);
    console.log("initTempAccountIx: TransactionInstruction", initTempAccountIx);

    console.log("Step2 - 3 create Instruction to transfer the token from X Token to temp token"); //TransactionInstruction
    const transferXTokensToTempAccIx = Token
        .createTransferInstruction(TOKEN_PROGRAM_ID, initializerXTokenAccountPubkey, tempTokenAccount.publicKey, initializerAccount.publicKey, [], amountXTokensToSendToEscrow);
    console.log("transferXTokensToTempAccIx: TransactionInstruction", initTempAccountIx);


    // console.log("Step3 Send Transaction");
    // const tx1 = new Transaction()
    //     .add(createTempTokenAccountIx, initTempAccountIx, transferXTokensToTempAccIx);
    // await connection.sendTransaction(tx1,
    //     [initializerAccount, tempTokenAccount],
    //     {skipPreflight: false, preflightCommitment: 'singleGossip'});
    //
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    //
    // let parsedTempAccount = (await connection.getParsedAccountInfo(tempTokenAccount.publicKey, 'singleGossip'))!;
    // let parsedInitializerAccount = (await connection.getParsedAccountInfo(initializerXTokenAccountPubkey, 'singleGossip'))!;
    // parsedXTokenMintAccount = (await connection.getParsedAccountInfo(XTokenMintAccountPubkey, 'singleGossip'));
    // console.log("parsedTempAccount: ", parsedTempAccount, "parsedInitializerAccount: ", parsedInitializerAccount, "parsedXTokenMintAccount", parsedXTokenMintAccount);
    //
    // return;

    console.log("Step2 - 4 create Instruction to create Escrow Account"); //TransactionInstruction
    const escrowAccount = new Account();
    const escrowProgramId = new PublicKey(escrowProgramIdString);

    const createEscrowAccountIx = SystemProgram.createAccount({
        space: ESCROW_ACCOUNT_DATA_LAYOUT.span,
        lamports: await connection.getMinimumBalanceForRentExemption(ESCROW_ACCOUNT_DATA_LAYOUT.span, 'singleGossip'),
        fromPubkey: initializerAccount.publicKey,
        newAccountPubkey: escrowAccount.publicKey,
        programId: escrowProgramId
    });
    console.log("createEscrowAccountIx: TransactionInstruction", createEscrowAccountIx);

    console.log("Step2 - 5 create Instruction to InitEscrow"); //TransactionInstruction
    const initEscrowIx = new TransactionInstruction({
        programId: escrowProgramId,
        keys: [
            { pubkey: initializerAccount.publicKey, isSigner: true, isWritable: false },
            { pubkey: tempTokenAccount.publicKey, isSigner: false, isWritable: true },
            { pubkey: new PublicKey(initializerReceivingTokenAccountPubkeyString), isSigner: false, isWritable: false },
            { pubkey: escrowAccount.publicKey, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(Uint8Array.of(0, ...new BN(expectedAmount).toArray("le", 8)))
    })

    console.log("Step3 Send Transaction");
    const tx = new Transaction()
        .add(createTempTokenAccountIx, initTempAccountIx, transferXTokensToTempAccIx, createEscrowAccountIx, initEscrowIx);
    await connection.sendTransaction(tx,
        [initializerAccount, tempTokenAccount, escrowAccount],
        // [initializerAccount],
        {skipPreflight: false, preflightCommitment: 'singleGossip'});

    await new Promise((resolve) => setTimeout(resolve, 1000));

    let parsedTempAccount = (await connection.getParsedAccountInfo(tempTokenAccount.publicKey, 'singleGossip'))!;
    let parsedInitializerAccount = (await connection.getParsedAccountInfo(initializerXTokenAccountPubkey, 'singleGossip'))!;
    // parsedXTokenMintAccount = (await connection.getParsedAccountInfo(XTokenMintAccountPubkey, 'singleGossip'));
    let parsedEscrowAccount = (await connection.getParsedAccountInfo(escrowAccount.publicKey, 'singleGossip'));
    console.log("parsedTempAccount: ", parsedTempAccount);
    console.log("parsedInitializerAccount: ", parsedInitializerAccount);
    // console.log("parsedXTokenMintAccount", parsedXTokenMintAccount);
    console.log("escrowAccount.publicKey", escrowAccount.publicKey.toBase58(), "parsedEscrowAccount", parsedEscrowAccount);

    const encodedEscrowState = (await connection.getAccountInfo(escrowAccount.publicKey, 'singleGossip'))!.data;
    const decodedEscrowState = ESCROW_ACCOUNT_DATA_LAYOUT.decode(encodedEscrowState) as EscrowLayout;
    console.log("decodedEscrowState", decodedEscrowState);
    // return;
    return {
        escrowAccountPubkey: escrowAccount.publicKey.toBase58(),
        isInitialized: !!decodedEscrowState.isInitialized,
        initializerAccountPubkey: new PublicKey(decodedEscrowState.initializerPubkey).toBase58(),
        XTokenTempAccountPubkey: new PublicKey(decodedEscrowState.initializerTempTokenAccountPubkey).toBase58(),
        initializerYTokenAccount: new PublicKey(decodedEscrowState.initializerReceivingTokenAccountPubkey).toBase58(),
        expectedAmount: new BN(decodedEscrowState.expectedAmount, 10, "le").toNumber()
    };
}

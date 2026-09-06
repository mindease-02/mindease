"""
Preference-tune a small open model on pairs produced by scripts/build-preference-pairs.ts.
Skeleton using TRL; not run in this repo (needs a GPU box). Install:
    pip install "trl>=0.12" "transformers>=4.45" peft datasets accelerate

    python training/dpo_lora.py --pairs data/pairs.jsonl --base meta-llama/Llama-3.1-8B-Instruct

Each JSONL row: {"prompt": [...chat messages...], "chosen": "...", "rejected": "..."}.
Safety stays outside the model: this only changes tone and register.
"""
import argparse, json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", required=True)
    ap.add_argument("--base", default="meta-llama/Llama-3.1-8B-Instruct")
    ap.add_argument("--out", default="models/mindease-dpo-lora")
    args = ap.parse_args()

    from datasets import Dataset
    from peft import LoraConfig
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from trl import DPOConfig, DPOTrainer

    rows = [json.loads(l) for l in open(args.pairs)]
    tok = AutoTokenizer.from_pretrained(args.base)
    ds = Dataset.from_list([
        {"prompt": tok.apply_chat_template(r["prompt"], tokenize=False, add_generation_prompt=True),
         "chosen": r["chosen"], "rejected": r["rejected"]} for r in rows
    ])
    model = AutoModelForCausalLM.from_pretrained(args.base, torch_dtype="auto")
    cfg = DPOConfig(output_dir=args.out, beta=0.1, learning_rate=5e-6, num_train_epochs=2,
                    per_device_train_batch_size=2, gradient_accumulation_steps=8, max_length=1536,
                    logging_steps=10, save_strategy="epoch", bf16=True)
    lora = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, target_modules=["q_proj", "k_proj", "v_proj", "o_proj"])
    trainer = DPOTrainer(model=model, args=cfg, train_dataset=ds, processing_class=tok, peft_config=lora)
    trainer.train()
    trainer.save_model(args.out)


if __name__ == "__main__":
    main()
